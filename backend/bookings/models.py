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

    # کد رزرو: ترکیب کد کاروان + تاریخ حرکت + روز سفر
    booking_code = models.CharField(max_length=40, blank=True, db_index=True, verbose_name='کد رزرو')

    # Guardian (main passenger)
    main_passenger_first_name = models.CharField(max_length=50, blank=True, verbose_name='نام سرپرست')
    main_passenger_last_name = models.CharField(max_length=50, blank=True, verbose_name='نام خانوادگی سرپرست')
    main_passenger_name = models.CharField(max_length=100, verbose_name='نام و نام خانوادگی سرپرست')
    main_passenger_id = models.CharField(max_length=20, blank=True, verbose_name='کد ملی سرپرست')
    main_passenger_phone = models.CharField(max_length=20, blank=True, verbose_name='شماره موبایل سرپرست')
    main_passenger_birthdate = models.CharField(max_length=15, blank=True, verbose_name='تاریخ تولد سرپرست')
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
    payment_link = models.URLField(
        max_length=500, blank=True, verbose_name='لینک پرداخت',
        help_text='پس از تأیید نهایی، لینک پرداخت در صفحه رسید زائر نمایش داده می‌شود.',
    )

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
        return f"رزرو {self.booking_code or f'#{self.id}'} — {self.main_passenger_name}"

    def build_booking_code(self):
        """کد رزرو = کد کاروان + تاریخ حرکت + روز سفر + شماره ترتیبی رزرو.

        نمونه: ک۱۲ → C12-14030815-D5-0007
        """
        caravan = self.caravan
        # تاریخ حرکت ممکن است با ارقام فارسی وارد شده باشد؛ کد رزرو باید لاتین باشد
        # تا کپی/جستجو و خروجی CSV بدون مشکل کار کند.
        table = str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789')
        raw = str(caravan.departure_date or '').translate(table)
        digits = ''.join(ch for ch in raw if ch.isdigit())
        if not digits and caravan.start_date:
            digits = caravan.start_date.strftime('%Y%m%d')
        date_part = digits or '00000000'
        day_part = f"D{caravan.duration or 0}"
        seq = Booking.objects.filter(caravan=caravan).exclude(pk=self.pk).count() + 1
        return f"C{caravan.id}-{date_part}-{day_part}-{seq:04d}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.booking_code:
            # بعد از ذخیره اولیه تولید می‌شود تا pk موجود باشد
            Booking.objects.filter(pk=self.pk).update(booking_code=self.build_booking_code())
            self.refresh_from_db(fields=['booking_code'])
