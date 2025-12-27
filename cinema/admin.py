from django.contrib import admin
from .models import Movie, Booking, Review, AppUser, Showtime, Salon

# 1. FİLMLER (Movies)
@admin.register(Movie)
class MovieAdmin(admin.ModelAdmin):
    list_display = ('title', 'genre', 'director', 'duration') # Listede görünecek sütunlar
    search_fields = ('title', 'director') # Arama çubuğu neye göre arasın?
    list_filter = ('genre',) # Sağ tarafta filtre menüsü

# 2. BİLETLER (Bookings) - En Önemlisi
@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('booking_id', 'get_user_name', 'get_movie_title', 'seat_number', 'status', 'booking_date')
    list_filter = ('status', 'booking_date', 'session__movie__title') # Filme ve duruma göre filtrele
    search_fields = ('user__name', 'seat_number') # Kullanıcı adına göre arama yap
    
    # İlişkili tablolardan veri çekmek için özel fonksiyonlar:
    def get_user_name(self, obj):
        return obj.user.name
    get_user_name.short_description = 'Kullanıcı'

    def get_movie_title(self, obj):
        return obj.session.movie.title
    get_movie_title.short_description = 'Film'

# 3. YORUMLAR (Reviews)
@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('get_user', 'get_movie', 'rating', 'is_verified_purchase', 'created_at')
    list_filter = ('rating', 'is_verified_purchase') # Puanına göre filtrele
    
    def get_user(self, obj):
        return obj.user.name
    get_user.short_description = 'Yorum Yapan'

    def get_movie(self, obj):
        return obj.movie.title
    get_movie.short_description = 'Film'

# 4. KULLANICILAR (AppUser)
@admin.register(AppUser)
class AppUserAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'get_friend_count')
    search_fields = ('name', 'email')

    def get_friend_count(self, obj):
        return obj.friends.count()
    get_friend_count.short_description = 'Arkadaş Sayısı'

# Diğerleri (Basit Kayıt)
admin.site.register(Showtime)
admin.site.register(Salon)