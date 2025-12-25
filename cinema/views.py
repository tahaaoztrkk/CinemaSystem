from django.shortcuts import render
from .models import Movie

def index(request):
    # Veritabanındaki tüm filmleri alıyoruz
    all_movies = Movie.objects.all()
    # 'movies_from_db' ismiyle HTML'e gönderiyoruz
    return render(request, 'cinema/index.html', {'movies_from_db': all_movies})