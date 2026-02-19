from django.db import models
from django.conf import settings
from carvans.models import Caravan

class Booking(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    caravan = models.ForeignKey(Caravan, on_delete=models.CASCADE)
    main_passenger_name = models.CharField(max_length=100)
    main_passenger_id = models.CharField(max_length=20)
    main_passenger_phone = models.CharField(max_length=20)
    main_passenger_birthdate = models.CharField(max_length=15)
    passenger_count = models.PositiveIntegerField(default=1)
    companions = models.JSONField(default=list, blank=True)  # لیست همراهان
    address = models.TextField(blank=True, null=True)
    special_requests = models.TextField(blank=True, null=True)
    selected_seats = models.JSONField(default=list, blank=True)  # لیست شماره صندلی‌ها
    total_price = models.PositiveIntegerField()
    is_paid = models.BooleanField(default=False)
    payment_date = models.DateTimeField(blank=True, null=True)
    payment_reference = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=30, default='pending') # pending, confirmed, cancelled, completed
    current_step = models.PositiveIntegerField(default=1)
    is_completed = models.BooleanField(default=False)
    transportation_type = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"رزرو {self.id} توسط کاربر {self.user_id}"
