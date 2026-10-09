from django.db import models
from django.conf import settings
import uuid


class Caravan(models.Model):
    DESTINATION_CHOICES = [
        ('mashhad', 'مشهد مقدس'),
        ('karbala', 'کربلای معلا'),
        ('hajj_umrah', 'حج/عمره'),
        ('qom_jamkaran', 'قم/جمکران'),
    ]

    TRANSPORT_CHOICES = [
        ('bus', 'اتوبوس'),
        ('train', 'قطار'),
        ('airplane', 'هواپیما'),
        ('combined', 'ترکیبی'),
    ]

    TRAIN_TYPE_CHOICES = [
        ('coach', 'اتوبوسی'),
        ('four_bed', '۴ تخته'),
        ('six_bed', '۶ تخته'),
    ]

    BUS_TYPE_CHOICES = [
        (25, 'اتوبوس ۲۵ نفره (VIP)'),
        (32, 'اتوبوس ۳۲ نفره'),
        (44, 'اتوبوس ۴۴ نفره'),
    ]

    ACCOMMODATION_CHOICES = [
        ('hotel', 'هتل'),
        ('hosseinieh', 'حسینیه'),
        ('apartment', 'آپارتمان'),
        ('mixed', 'ترکیبی'),
    ]

    REGISTRATION_CHOICES = [
        ('open', 'ثبت‌نام باز است'),
        ('soon', 'ثبت‌نام به‌زودی'),
        ('closed', 'ثبت‌نام بسته است'),
    ]

    STATUS_CHOICES = [
        ('pending', 'در انتظار تأیید'),
        ('approved', 'تأیید شده'),
        ('rejected', 'رد شده'),
    ]

    # Core
    name = models.CharField(max_length=200, verbose_name='نام کاروان')
    destination = models.CharField(max_length=20, choices=DESTINATION_CHOICES, default='karbala', verbose_name='مقصد')
    description = models.TextField(blank=True, null=True, verbose_name='توضیحات')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name='وضعیت')

    # Leader
    leader = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='led_caravans',
        verbose_name='مدیر کاروان',
    )
    manager = models.CharField(max_length=100, blank=True, verbose_name='نام مدیر کاروان')
    contact_phone = models.CharField(max_length=20, blank=True, verbose_name='شماره تماس کاروان')
    leader_messaging_apps = models.JSONField(default=list, blank=True, verbose_name='پیام‌رسان‌های مدیر')

    # Dates & Duration
    departure_date = models.CharField(max_length=30, verbose_name='تاریخ حرکت (شمسی)')
    duration = models.IntegerField(verbose_name='مدت سفر (روز)')
    start_date = models.DateTimeField(null=True, blank=True, verbose_name='تاریخ شروع')
    end_date = models.DateTimeField(null=True, blank=True, verbose_name='تاریخ پایان')

    # Transport
    transportation_type = models.CharField(max_length=20, choices=TRANSPORT_CHOICES, default='bus', verbose_name='نوع حمل‌ونقل')
    bus_type = models.PositiveSmallIntegerField(
        choices=BUS_TYPE_CHOICES, default=44,
        verbose_name='نوع اتوبوس (ظرفیت هر اتوبوس)',
        help_text='برای سفرهای زمینی: تعداد صندلی هر اتوبوس. چیدمان صندلی رزرو بر همین اساس ساخته می‌شود.',
    )
    train_type = models.CharField(
        max_length=20, choices=TRAIN_TYPE_CHOICES, blank=True, default='',
        verbose_name='نوع واگن قطار',
        help_text='فقط برای سفرهای قطاری: اتوبوسی، ۴ تخته یا ۶ تخته.',
    )
    seat_selection_enabled = models.BooleanField(
        default=False,
        verbose_name='انتخاب صندلی توسط زائر',
        help_text=(
            'تا وقتی خاموش است، زائر نقشه‌ی صندلی را نمی‌بیند و رزرو بدون شماره‌ی صندلی ثبت '
            'می‌شود؛ صندلی‌ها را خودتان بعداً تخصیص می‌دهید. روشن کردنش باعث می‌شود هر کسی '
            'که فرم را پر کند صندلی را اشغال کند.'
        ),
    )
    origin_city = models.CharField(max_length=100, blank=True, verbose_name='مبدأ حرکت')
    transit_cities = models.JSONField(default=list, blank=True, verbose_name='شهرهای بین‌راهی')

    # Accommodation
    accommodation_type = models.CharField(max_length=20, choices=ACCOMMODATION_CHOICES, default='hotel', verbose_name='نوع اقامتگاه')
    accommodation_name = models.CharField(max_length=200, blank=True, verbose_name='نام اقامتگاه')
    accommodation_city = models.CharField(max_length=100, blank=True, verbose_name='شهر اقامتگاه')
    accommodation_distance = models.IntegerField(default=0, verbose_name='فاصله تا حرم (متر)')

    # Meals & Services
    meal_breakfast = models.BooleanField(default=False, verbose_name='صبحانه')
    meal_lunch = models.BooleanField(default=False, verbose_name='ناهار')
    meal_dinner = models.BooleanField(default=False, verbose_name='شام')
    has_insurance = models.BooleanField(default=False, verbose_name='بیمه مسافرتی')

    # Itinerary
    itinerary = models.JSONField(default=list, blank=True, verbose_name='برنامه سفر')

    # Pricing & Capacity
    price = models.IntegerField(verbose_name='قیمت هر نفر (تومان)')
    capacity = models.IntegerField(verbose_name='ظرفیت')
    remaining_capacity = models.IntegerField(verbose_name='ظرفیت باقیمانده')
    registration_state = models.CharField(
        max_length=10, choices=REGISTRATION_CHOICES, default='open',
        verbose_name='وضعیت ثبت‌نام',
        help_text='با «به‌زودی» کاروان در سایت دیده می‌شود ولی دکمه‌ی رزرو غیرفعال است.',
    )
    registration_opens_on = models.CharField(
        max_length=30, blank=True, verbose_name='تاریخ بازشدن ثبت‌نام (شمسی)',
        help_text='اختیاری. مثلاً ۱۴۰۵/۰۸/۱۵ — کنار «به‌زودی» به زائر نشان داده می‌شود.',
    )

    # Rules
    rules = models.TextField(blank=True, verbose_name='قوانین و مقررات کاروان')

    # Media
    image_url = models.CharField(max_length=300, blank=True, null=True, verbose_name='لینک تصویر')
    image = models.ImageField(upload_to='caravans/', blank=True, null=True, verbose_name='تصویر کاروان')

    # Tags
    popular = models.BooleanField(default=False, verbose_name='محبوب')
    special_tag = models.CharField(max_length=100, blank=True, null=True, verbose_name='برچسب ویژه')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'کاروان'
        verbose_name_plural = 'کاروان‌ها'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} — {self.get_destination_display()}"

    @property
    def is_full(self):
        return (self.remaining_capacity or 0) <= 0

    @property
    def is_bookable(self):
        """زائر فقط وقتی می‌تواند رزرو کند که ثبت‌نام باز باشد و ظرفیت بماند."""
        return self.registration_state == 'open' and not self.is_full

    @property
    def availability_label(self):
        """برچسبی که روی کارت کاروان می‌نشیند."""
        if self.is_full:
            return 'تکمیل شده'
        if self.registration_state == 'soon':
            if self.registration_opens_on:
                return f'ثبت‌نام از {self.registration_opens_on}'
            return 'ثبت‌نام به‌زودی'
        if self.registration_state == 'closed':
            return 'ثبت‌نام بسته است'
        return 'دارای ظرفیت'

    @property
    def availability_tone(self):
        """رنگ برچسب: سبز باز، کهربایی به‌زودی، قرمز تکمیل، خاکستری بسته."""
        if self.is_full:
            return 'full'
        if self.registration_state == 'soon':
            return 'soon'
        if self.registration_state == 'closed':
            return 'closed'
        return 'open'

    @property
    def is_international(self):
        return self.destination in ('karbala', 'hajj_umrah')

    @property
    def is_air_travel(self):
        return self.transportation_type in ('airplane', 'combined')

    @property
    def is_ground_transport(self):
        """سفرهای زمینی (اتوبوسی)."""
        return self.transportation_type in ('bus', 'combined')

    @property
    def seat_selection_active(self):
        """زائر فقط وقتی صندلی انتخاب می‌کند که سفر زمینی باشد و کاروان این را روشن کرده باشد."""
        return self.is_ground_transport and self.seat_selection_enabled

    @property
    def bus_count(self):
        """تعداد اتوبوس‌های لازم برای پوشش ظرفیت کاروان."""
        if not self.is_ground_transport or not self.bus_type:
            return 0
        return -(-(self.capacity or 0) // self.bus_type)  # ceil division


class CaravanPhoto(models.Model):
    CATEGORY_CHOICES = [
        ('accommodation', 'اقامتگاه'),
        ('transport', 'حمل‌ونقل'),
        ('shrine', 'حرم و اماکن مقدس'),
        ('general', 'عمومی'),
    ]

    caravan = models.ForeignKey(Caravan, on_delete=models.CASCADE, related_name='photos', verbose_name='کاروان')
    photo = models.ImageField(upload_to='caravan_photos/', verbose_name='تصویر')
    caption = models.CharField(max_length=200, blank=True, verbose_name='توضیح تصویر')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='general', verbose_name='دسته‌بندی')
    order = models.IntegerField(default=0, verbose_name='ترتیب نمایش')

    class Meta:
        verbose_name = 'تصویر کاروان'
        verbose_name_plural = 'تصاویر کاروان'
        ordering = ['order', 'id']

    def __str__(self):
        return f"تصویر {self.id} — {self.caravan.name}"


class CaravanReview(models.Model):
    caravan = models.ForeignKey(Caravan, on_delete=models.CASCADE, related_name='reviews', verbose_name='کاروان')
    booking = models.OneToOneField(
        'bookings.Booking', on_delete=models.CASCADE, related_name='review',
        null=True, blank=True, verbose_name='رزرو'
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, verbose_name='توکن نظرسنجی')
    reviewer_name = models.CharField(max_length=100, blank=True, verbose_name='نام زائر')
    rating = models.PositiveSmallIntegerField(default=0, verbose_name='امتیاز (۰-۵)')
    comment = models.TextField(blank=True, verbose_name='نظر')
    is_submitted = models.BooleanField(default=False, verbose_name='ثبت شده')
    created_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'نظر زائر'
        verbose_name_plural = 'نظرات زائران'
        ordering = ['-submitted_at', '-created_at']

    def __str__(self):
        return f"نظر {self.reviewer_name} — {self.caravan.name} ({self.rating}★)"
