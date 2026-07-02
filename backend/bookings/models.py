from django.db import models
from django.conf import settings
from carvans.models import Caravan


class Booking(models.Model):
    STATUS_CHOICES = [
        ('pending', 'در انتظار'),
        ('confirmed', 'تأیید شده'),
        ('cancelled', 'لغو شده'),
        ('completed', 'تکمیل شده'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, verbose_name='کاربر')
    caravan = models.ForeignKey(Caravan, on_delete=models.CASCADE, verbose_name='کاروان')

    # Guardian (main passenger)
    main_passenger_name = models.CharField(max_length=100, verbose_name='نام سرپرست')
    main_passenger_id = models.CharField(max_length=20, blank=True, verbose_name='کد ملی سرپرست')
    main_passenger_phone = models.CharField(max_length=20, verbose_name='شماره موبایل سرپرست')
    main_passenger_birthdate = models.CharField(max_length=15, verbose_name='تاریخ تولد سرپرست')
    main_passenger_emergency_phone = models.CharField(max_length=20, blank=True, verbose_name='شماره اضطراری سرپرست')
    main_passenger_messaging_apps = models.JSONField(default=list, blank=True, verbose_name='پیام‌رسان‌های سرپرست')

    # For international trips (passport info for main passenger)
    main_passenger_passport_no = models.CharField(max_length=20, blank=True, verbose_name='شماره گذرنامه سرپرست')
    main_passenger_foreign_name = models.CharField(max_length=100, blank=True, verbose_name='نام انگلیسی سرپرست')
    main_passenger_foreign_lastname = models.CharField(max_length=100, blank=True, verbose_name='نام خانوادگی انگلیسی سرپرست')

    passenger_count = models.PositiveIntegerField(default=1, verbose_name='تعداد مسافرین')
    companions = models.JSONField(default=list, blank=True, verbose_name='همراهان')

    special_requests = models.TextField(blank=True, null=True, verbose_name='درخواست‌های خاص')
    selected_seats = models.JSONField(default=list, blank=True, verbose_name='صندلی‌های انتخابی')

    total_price = models.PositiveIntegerField(verbose_name='مبلغ کل')
    is_paid = models.BooleanField(default=False, verbose_name='پرداخت شده')
    payment_date = models.DateTimeField(blank=True, null=True, verbose_name='تاریخ پرداخت')
    payment_reference = models.CharField(max_length=100, blank=True, null=True, verbose_name='کد پیگیری')

    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending', verbose_name='وضعیت')
    current_step = models.PositiveIntegerField(default=1)
    is_completed = models.BooleanField(default=False)
    transportation_type = models.CharField(max_length=50, verbose_name='نوع حمل‌ونقل')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'رزرو'
        verbose_name_plural = 'رزروها'
        ordering = ['-created_at']

    def __str__(self):
        return f"رزرو #{self.id} — {self.main_passenger_name}"
