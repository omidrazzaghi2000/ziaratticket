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
    boarding_city = models.CharField(
        max_length=100, blank=True, verbose_name='محل سوار شدن',
        help_text='یکی از مبدأها یا شهرهای بین‌راهی کاروان که زائر از آن سوار می‌شود.',
    )
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

    SOURCE_CHOICES = [('site', 'سایت'), ('bale', 'ربات بله')]
    source = models.CharField(
        max_length=10, choices=SOURCE_CHOICES, default='site', verbose_name='ثبت از',
    )

    # نتیجه‌ی اطلاع به مدیر کاروان در بله — تا اگر پیامی نرسید، دلیلش همین‌جا
    # در پنل دیده شود و نیازی به گشتن در لاگ سرور نباشد.
    bale_notified_at = models.DateTimeField(null=True, blank=True, verbose_name='اطلاع بله ارسال شد')
    bale_notify_error = models.CharField(max_length=255, blank=True, verbose_name='خطای اطلاع بله')

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

    def cancel(self):
        """
        رزرو را لغو می‌کند و صندلی‌هایش را به ظرفیت کاروان برمی‌گرداند.

        تنها راه لغو است (داشبورد مدیر، پنل ادمین، API) تا ظرفیت همه‌جا یک‌جور
        حساب شود. دو قاعده که قبلاً رعایت نمی‌شد:
        * لغو دوباره هیچ کاری نمی‌کند — قبلاً هر کلیک دوباره ظرفیت را بیشتر می‌کرد.
        * فقط رزرو تکمیل‌شده صندلی گرفته بود (CompleteBookingView کم می‌کند)؛
          رزرو نیمه‌کاره چیزی برای پس‌دادن ندارد.
        صندلی‌های انتخابی خودبه‌خود آزاد می‌شوند، چون نقشه‌ی صندلی رزروهای
        لغوشده را نمی‌شمارد.

        خروجی: تعداد صندلی‌ای که به ظرفیت برگشت (۰ اگر چیزی برنگشت)، یا None
        اگر رزرو از قبل لغو شده بود.
        """
        from django.db import transaction

        with transaction.atomic():
            booking = Booking.objects.select_for_update().get(pk=self.pk)
            if booking.status == 'cancelled':
                return None
            booking.status = 'cancelled'
            booking.save(update_fields=['status', 'updated_at'])
            # ردیف‌های دفتر کاروان پاک نمی‌شوند، چون پولی که داده شده باید پیدا
            # بماند؛ فقط خط می‌خورند و از جمع‌ها بیرون می‌روند.
            LedgerRow.objects.filter(booking=booking).update(is_cancelled=True)
            returned = 0
            if booking.is_completed:
                caravan = Caravan.objects.select_for_update().get(pk=booking.caravan_id)
                before = caravan.remaining_capacity or 0
                # از ظرفیت کل بیشتر نشود، حتی اگر عدد قبلاً به‌هم ریخته باشد
                caravan.remaining_capacity = min(caravan.capacity or 0, before + booking.passenger_count)
                caravan.save(update_fields=['remaining_capacity'])
                returned = caravan.remaining_capacity - before
        self.refresh_from_db()
        return returned

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.booking_code:
            # بعد از ذخیره اولیه تولید می‌شود تا pk موجود باشد
            Booking.objects.filter(pk=self.pk).update(booking_code=self.build_booking_code())
            self.refresh_from_db(fields=['booking_code'])


class BaleChat(models.Model):
    """
    یک گفتگوی ربات بله با یک زائر.

    ربات بی‌حافظه است: هر پیام جداگانه به وب‌هوک می‌رسد. این ردیف یادش نگه
    می‌دارد که این چت متعلق به کدام حساب است (بعد از تأیید شماره) و زائر در
    کدام مرحله‌ی فرم رزرو است. تا آخر کار هیچ رزروی ساخته نمی‌شود؛ جواب‌های
    نیمه‌کاره فقط همین‌جا در ``data`` می‌مانند.
    """
    chat_id = models.CharField(max_length=40, unique=True, verbose_name='شناسه چت')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='bale_chats', verbose_name='حساب کاربر',
    )
    state = models.CharField(max_length=30, blank=True, default='', verbose_name='مرحله')
    data = models.JSONField(default=dict, blank=True, verbose_name='پاسخ‌های نیمه‌کاره')
    last_update_id = models.BigIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, verbose_name='آخرین پیام')

    class Meta:
        verbose_name = 'گفتگوی ربات بله'
        verbose_name_plural = 'گفتگوهای ربات بله'
        ordering = ['-updated_at']

    def __str__(self):
        return f"چت {self.chat_id} — {self.user or 'ناشناس'}"


class LedgerRow(models.Model):
    """
    یک نفر در دفتر کاروان: نام، تماس، هزینه، پرداختی، الباقی، مبدأ، توضیح.

    مدیر کاروان حساب هر مسافر را اینجا نگه می‌دارد. رزروهای سایت و ربات بله
    خودشان ردیف می‌سازند (سرپرست و هر همراه جدا)؛ ثبت‌نام تلفنی و حضوری را مدیر
    دستی اضافه می‌کند. الباقی ذخیره نمی‌شود و همیشه «هزینه − پرداختی» است، تا
    هیچ‌وقت با دو عدد دیگر ناهمخوان نشود.
    """
    ORIGIN_CHOICES = [
        ('tehran', 'تهران'),
        ('qom', 'قم'),
        ('mehran', 'مرز مهران'),
        ('transit', 'بین‌راهی'),
    ]

    caravan = models.ForeignKey(
        Caravan, on_delete=models.CASCADE, related_name='ledger_rows', verbose_name='کاروان')
    booking = models.ForeignKey(
        'Booking', on_delete=models.SET_NULL, null=True, blank=True, related_name='ledger_rows',
        verbose_name='رزرو', help_text='خالی یعنی مدیر کاروان این نفر را دستی اضافه کرده است.')
    # None = سرپرست رزرو؛ ۰، ۱، … = همراه چندم
    companion_index = models.PositiveSmallIntegerField(null=True, blank=True)
    full_name = models.CharField(max_length=120, verbose_name='نام و نام خانوادگی')
    phone = models.CharField(max_length=20, blank=True, verbose_name='شماره تماس')
    cost = models.PositiveBigIntegerField(default=0, verbose_name='هزینه کاروان (تومان)')
    paid = models.PositiveBigIntegerField(default=0, verbose_name='مبلغ پرداخت‌شده (تومان)')
    origin = models.CharField(max_length=10, choices=ORIGIN_CHOICES, blank=True, verbose_name='مبدأ')
    notes = models.TextField(blank=True, verbose_name='توضیحات')
    is_cancelled = models.BooleanField(default=False, verbose_name='لغو شده')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'ردیف دفتر کاروان'
        verbose_name_plural = 'دفتر کاروان‌ها'
        ordering = ['created_at', 'id']

    def __str__(self):
        return f"{self.full_name} — {self.caravan.name}"

    @property
    def remaining(self):
        """منفی یعنی بیش از هزینه پرداخت کرده است."""
        return int(self.cost) - int(self.paid)

    @property
    def is_manual(self):
        return self.booking_id is None
