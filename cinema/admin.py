from django.contrib import admin
from .models import AppUser, Movie, Salon, Showtime, Booking, Review

admin.site.register(AppUser)
admin.site.register(Movie)
admin.site.register(Salon)
admin.site.register(Showtime)
admin.site.register(Booking)
admin.site.register(Review)