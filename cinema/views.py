from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
import json
import datetime
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User

# Modellerini içeri aktar
from .models import Movie, Booking, AppUser, Showtime, Salon, Review

# views.py dosyasındaki index fonksiyonunu şöyle değiştir:
def index(request):
    db_movies = Movie.objects.all()
    db_bookings = Booking.objects.all() # Dolu koltuklar için hepsi lazım
    db_reviews = Review.objects.all().order_by('-created_at')
    # KULLANICIYA ÖZEL BİLETLERİ ÇEKME
    user_tickets = []
    if request.user.is_authenticated:
        # 1. Giriş yapan kullanıcının AppUser kaydını bul
        # (book_ticket fonksiyonunda ismi username olarak kaydetmiştik)
        try:
            app_user = AppUser.objects.get(name=request.user.username)
            # 2. Sadece bu kullanıcıya ait biletleri filtrele
            user_tickets = Booking.objects.filter(user=app_user).order_by('-booking_id')
        except AppUser.DoesNotExist:
            user_tickets = []

    context = {
        'movies_from_db': db_movies,
        'bookings_from_db': db_bookings,
        'my_tickets': user_tickets, # <-- HTML'e gönderdiğimiz yeni paket
        'reviews_from_db': db_reviews
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
def api_logout(request):
    logout(request) # Oturumu kapat
    return JsonResponse({'status': 'success', 'message': 'Çıkış yapıldı'})