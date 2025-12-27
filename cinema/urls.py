from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/book/', views.book_ticket, name='book_ticket'),
    path('api/login/', views.api_login, name='api_login'),
    path('api/register/', views.api_register, name='api_register'),
    path('api/logout/', views.api_logout, name='api_logout'),
    
    # YENİ EKLENEN:
    path('api/cancel/', views.cancel_ticket, name='cancel_ticket'),
    path('api/add_review/', views.add_review, name='add_review'),
    path('api/add_friend/', views.add_friend, name='add_friend'),
]