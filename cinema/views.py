from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
import json
import datetime
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db.models import Avg

# Modellerini içeri aktar
from .models import Movie, Booking, AppUser, Showtime, Salon, Review, FriendRequest

# views.py dosyasındaki index fonksiyonunu şöyle değiştir:
def index(request):
    # 1. Filmler ve Puanlar
    db_movies = Movie.objects.annotate(avg_rating=Avg('review__rating'))
    
    # 2. Yorumlar
    db_reviews = Review.objects.all().order_by('-created_at')

    # 3. Biletler ve Arkadaş Kontrolü (BURASI DEĞİŞTİ)
    all_bookings = Booking.objects.all()
    bookings_data = [] # HTML'e gidecek özel liste
    
    current_app_user = None
    my_friends_ids = [] # Arkadaşların ID listesi

    if request.user.is_authenticated:
        try:
            current_app_user = AppUser.objects.get(name=request.user.username)
            # Arkadaşlarımın ID'lerini bir listeye alalım
            my_friends_ids = list(current_app_user.friends.values_list('user_id', flat=True))
        except:
            pass

    for booking in all_bookings:
        # Bu bileti alan kişi benim arkadaşım mı?
        is_friend_booking = False
        if booking.user.user_id in my_friends_ids:
            is_friend_booking = True
        
        bookings_data.append({
            'movie_id': booking.session.movie.movie_id,
            'seat_number': booking.seat_number,
            'time': booking.session.start_time, # Template'de filter ile saat formatına dönecek
            'is_friend': is_friend_booking,     # EVET/HAYIR
            'owner_name': booking.user.name     # Kim almış?
        })

    # 4. Profilimdeki Biletler
    user_tickets = []
    if current_app_user:
        user_tickets = Booking.objects.filter(user=current_app_user).order_by('-booking_id')

    friend_requests = []
    if current_app_user:
        friend_requests = FriendRequest.objects.filter(to_user=current_app_user).order_by('-created_at')

    context = {
        'movies_from_db': db_movies,
        'bookings_json': bookings_data, # İşlenmiş veri gidiyor
        'reviews_from_db': db_reviews,
        'my_tickets': user_tickets,
        'current_app_user': current_app_user, # Profilde arkadaş listesi için lazım
        'friend_requests': friend_requests
    }
    return render(request, 'cinema/index.html', context)
    


@csrf_exempt
def book_ticket(request):
    if request.method == 'POST':
        # GÜVENLİK KONTROLÜ: Kullanıcı giriş yapmamışsa işlem yapma!
        if not request.user.is_authenticated:
            return JsonResponse({'status': 'error', 'message': 'Lütfen bilet almak için giriş yapınız.'}, status=401)

        try:
            data = json.loads(request.body)
            
            # Artık sadece giriş yapmış kullanıcıyı alıyoruz
            current_user_name = request.user.username
            
            # AppUser tablosunda bu kullanıcıyı bul
            # (Login/Register sırasında zaten oluşmuştu, burada sadece çekiyoruz)
            try:
                user = AppUser.objects.get(name=current_user_name)
            except AppUser.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': 'Kullanıcı profili bulunamadı.'}, status=400)

            movie = Movie.objects.get(movie_id=data['movieId'])

            # Tarih/Saat işlemleri (Aynı kalıyor)
            time_str = data['sessionTime']
            hour, minute = map(int, time_str.split(':'))
            now = timezone.now()
            start_dt = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            end_dt = start_dt + datetime.timedelta(hours=2)

            salon, _ = Salon.objects.get_or_create(name="Ana Salon", defaults={'total_rows': 8, 'seats_per_row': 6})
            session, _ = Showtime.objects.get_or_create(movie=movie, start_time=start_dt, defaults={'salon': salon, 'end_time': end_dt})

            # Bileti Kaydet
            new_booking = Booking.objects.create(
                user=user,
                session=session,
                seat_number=str(data['seatIndex']),
                price=150.00,
                status='Confirmed'
            )
            return JsonResponse({'status': 'success', 'booking_id': new_booking.booking_id})

        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
        
@csrf_exempt
def api_login(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        
        # Django veritabanında bu kullanıcı var mı kontrol et
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user) # Oturumu başlat
            return JsonResponse({
                'status': 'success', 
                'username': user.username,
                'message': 'Giriş başarılı'
            })
        else:
            return JsonResponse({'status': 'error', 'message': 'Kullanıcı adı veya şifre hatalı'}, status=401)

# views.py dosyasındaki api_register fonksiyonunu bununla değiştir:

@csrf_exempt
def api_register(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')
            email = data.get('email', '')

            # 1. Kullanıcı adı dolu mu?
            if User.objects.filter(username=username).exists():
                return JsonResponse({'status': 'error', 'message': 'Bu kullanıcı adı zaten alınmış.'})

            # 2. Django Auth Kullanıcısını Oluştur (Giriş için)
            user = User.objects.create_user(username=username, email=email, password=password)
            user.save()
            
            # 3. AppUser Tablosuna da Ekle (Biletler için - KRİTİK ADIM)
            # Eğer email boşsa, hata almamak için dummy bir email atıyoruz
            app_user_email = email if email else f"{username}@example.com"
            
            AppUser.objects.create(
                name=username,  # Django username'i ile AppUser name'i aynı olsun
                email=app_user_email,
                password_hash='managed_by_django' # Şifreyi Django yönetiyor
            )

            # 4. Otomatik Giriş Yap
            login(request, user)
            
            return JsonResponse({'status': 'success', 'username': user.username, 'message': 'Kayıt başarılı'})
        except Exception as e:
             return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
        
@csrf_exempt
def cancel_ticket(request):
    if request.method == 'POST':
        if not request.user.is_authenticated:
             return JsonResponse({'status': 'error', 'message': 'Yetkisiz işlem.'}, status=401)
        
        try:
            data = json.loads(request.body)
            booking_id = data.get('booking_id')
            
            # Sadece bu kullanıcıya ait olan bileti bul ve sil
            # (Başkası başkasının biletini silemesin diye 'user__name' kontrolü yapıyoruz)
            ticket = Booking.objects.get(booking_id=booking_id, user__name=request.user.username)
            ticket.delete()
            
            return JsonResponse({'status': 'success', 'message': 'Bilet iptal edildi.'})
        except Booking.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Bilet bulunamadı veya size ait değil.'}, status=404)
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
        
# --- YORUM EKLEME FONKSİYONU ---
@csrf_exempt
def add_review(request):
    if request.method == 'POST':
        if not request.user.is_authenticated:
            return JsonResponse({'status': 'error', 'message': 'Yorum yapmak için giriş yapmalısınız.'}, status=401)

        try:
            data = json.loads(request.body)
            # Verileri al
            movie_id = data.get('movieId')
            rating = data.get('rating')
            comment = data.get('comment')

            # Kullanıcı ve Film nesnelerini bul
            app_user = AppUser.objects.get(name=request.user.username)
            movie = Movie.objects.get(movie_id=movie_id)

            # Kullanıcı bu filmi daha önce izlemiş mi? (Bilet kontrolü)
            has_ticket = Booking.objects.filter(user=app_user, session__movie=movie).exists()

            # Yorumu Kaydet
            Review.objects.create(
                user=app_user,
                movie=movie,
                rating=rating,
                comment=comment,
                is_verified_purchase=has_ticket # Bilet aldıysa True olacak
            )

            return JsonResponse({'status': 'success', 'message': 'Yorumunuz eklendi!'})

        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=400)
        
@csrf_exempt
def add_friend(request):
    if request.method == 'POST':
        if not request.user.is_authenticated:
            return JsonResponse({'status': 'error', 'message': 'Giriş yapmalısınız.'})
        
        try:
            data = json.loads(request.body)
            target_username = data.get('username')
            
            sender = AppUser.objects.get(name=request.user.username)
            receiver = AppUser.objects.get(name=target_username)
            
            if sender == receiver:
                return JsonResponse({'status': 'error', 'message': 'Kendinize istek atamazsınız.'})
            
            # Zaten arkadaş mı?
            if receiver in sender.friends.all():
                 return JsonResponse({'status': 'error', 'message': 'Zaten arkadaşsınız.'})

            # Zaten istek atılmış mı?
            if FriendRequest.objects.filter(from_user=sender, to_user=receiver).exists():
                return JsonResponse({'status': 'error', 'message': 'Zaten bir istek gönderdiniz, cevap bekleniyor.'})

            # İSTEK OLUŞTUR
            FriendRequest.objects.create(from_user=sender, to_user=receiver)
            
            return JsonResponse({'status': 'success', 'message': f'{target_username} kullanıcısına istek gönderildi!'})
            
        except AppUser.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Kullanıcı bulunamadı.'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)})
        
@csrf_exempt
def handle_request(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            request_id = data.get('request_id')
            action = data.get('action') # 'accept' veya 'reject'

            friend_req = FriendRequest.objects.get(id=request_id)
            
            # Güvenlik: Bu istek gerçekten bana mı gelmiş?
            if friend_req.to_user.name != request.user.username:
                return JsonResponse({'status': 'error', 'message': 'Yetkisiz işlem.'})

            if action == 'accept':
                # İki tarafı birbirine arkadaş yap
                friend_req.to_user.friends.add(friend_req.from_user)
                # İsteği sil (artık gerek yok)
                friend_req.delete()
                return JsonResponse({'status': 'success', 'message': 'Arkadaşlık isteği kabul edildi!'})
            
            elif action == 'reject':
                # Sadece isteği sil
                friend_req.delete()
                return JsonResponse({'status': 'success', 'message': 'İstek reddedildi.'})

        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)})

@csrf_exempt
def api_logout(request):
    logout(request) # Oturumu kapat
    return JsonResponse({'status': 'success', 'message': 'Çıkış yapıldı'})