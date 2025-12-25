from django.db import models

class AppUser(models.Model):
    user_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True, max_length=150)
    password_hash = models.CharField(max_length=255)
    membership_level = models.CharField(max_length=20, blank=True, null=True)
    preferences = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'app_user'


class Movie(models.Model):
    movie_id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=200)
    genre = models.CharField(max_length=50, blank=True, null=True)
    director = models.CharField(max_length=100, blank=True, null=True)
    duration = models.IntegerField()
    release_date = models.DateField(blank=True, null=True)

    def __str__(self):
        return self.title

    class Meta:
        db_table = 'movie'


class Salon(models.Model):
    salon_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=50)
    total_rows = models.IntegerField()
    seats_per_row = models.IntegerField()
    screen_type = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'salon'


class Showtime(models.Model):
    session_id = models.AutoField(primary_key=True)
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE)
    salon = models.ForeignKey(Salon, on_delete=models.CASCADE)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()

    def __str__(self):
        return f"{self.movie.title} - {self.start_time}"

    class Meta:
        db_table = 'showtime'


class Booking(models.Model):
    booking_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(AppUser, on_delete=models.CASCADE)
    session = models.ForeignKey(Showtime, on_delete=models.CASCADE)
    seat_number = models.CharField(max_length=10)
    booking_date = models.DateTimeField(auto_now_add=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, default='Pending')

    class Meta:
        db_table = 'booking'
        unique_together = (('session', 'seat_number'),)


class Review(models.Model):
    # Django Composite Key desteklemediği için birincil anahtar eklendi
    review_id = models.AutoField(primary_key=True) 
    user = models.ForeignKey(AppUser, on_delete=models.CASCADE)
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE)
    rating = models.IntegerField()
    comment = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified_purchase = models.BooleanField(default=False)

    class Meta:
        db_table = 'review'
        unique_together = (('user', 'movie'),)