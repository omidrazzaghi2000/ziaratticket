from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
import re
import uuid

from core.bale import validate_bale_chat_id
from core.jalali import jalali_moment, parse_jalali_date


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
    bale_chat_id = models.CharField(
        max_length=40, blank=True, default='', verbose_name='شناسه چت بله مدیر',
        validators=[validate_bale_chat_id],
        help_text=(
            'اختیاری. اگر پر باشد، اطلاع رزروهای این کاروان به همین چت بله می‌رود؛ '
            'وگرنه از شناسه‌ی ثبت‌شده در حساب مدیر کاروان استفاده می‌شود.'
        ),
    )

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
    price_text = models.CharField(
        max_length=120, blank=True, default='', verbose_name='قیمت به‌صورت متن',
        help_text=(
            'اختیاری. اگر پر شود، همین متن به‌جای عدد به زائر نشان داده می‌شود — '
            'مثلاً «۵٬۰۰۰٬۰۰۰ تومان + ۱۰۰ دینار». عدد بالا باید پر بماند، چون '
            'مبلغ کل رزرو و فیلتر قیمت از روی آن حساب می‌شود.'
        ),
    )
    capacity = models.IntegerField(verbose_name='ظرفیت')
    remaining_capacity = models.IntegerField(verbose_name='ظرفیت باقیمانده')
    registration_state = models.CharField(
        max_length=10, choices=REGISTRATION_CHOICES, default='open',
        verbose_name='وضعیت ثبت‌نام',
        help_text=(
            'با «به‌زودی» کاروان در سایت دیده می‌شود ولی دکمه‌ی رزرو غیرفعال است. '
            'اگر تاریخ بازشدن بگذارید، لازم نیست این را دستی عوض کنید: سر همان '
            'تاریخ و ساعت ثبت‌نام خودش باز می‌شود. «بسته» همیشه بسته نگه می‌دارد.'
        ),
    )
    registration_opens_on = models.CharField(
        max_length=30, blank=True, verbose_name='تاریخ بازشدن ثبت‌نام (شمسی)',
        help_text=(
            'اختیاری. مثلاً ۱۴۰۵/۰۸/۱۵. تا این زمان کاروان «به‌زودی» نشان داده '
            'می‌شود و سر وقت خودکار باز می‌شود.'
        ),
    )
    registration_opens_time = models.TimeField(
        null=True, blank=True, verbose_name='ساعت بازشدن ثبت‌نام',
        help_text='اختیاری، مثلاً ۱۰:۰۰. بدون ساعت، ثبت‌نام از ابتدای همان روز باز می‌شود.',
    )
    registration_closes_on = models.CharField(
        max_length=30, blank=True, verbose_name='تاریخ پایان ثبت‌نام (شمسی)',
        help_text=(
            'اختیاری. مثلاً ۱۴۰۵/۰۸/۲۰. بعد از این زمان ثبت‌نام خودکار بسته و '
            'کاروان از فهرست سایت برداشته می‌شود. کاروانی که تاریخ حرکتش گذشته '
            'هم بدون این فیلد خودکار برداشته می‌شود.'
        ),
    )
    registration_closes_time = models.TimeField(
        null=True, blank=True, verbose_name='ساعت پایان ثبت‌نام',
        help_text='اختیاری. بدون ساعت، ثبت‌نام تا پایان همان روز باز می‌ماند.',
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
    def notification_chat_id(self):
        """چت بله‌ای که اطلاع رزروهای این کاروان باید به آن برود.

        اولویت: شناسه‌ی خود کاروان ← شناسه‌ی حساب مدیر کاروان ← شناسه‌ی پشتیبانی.
        کاروانی که هیچ‌کدام را ندارد، پیامی هم نمی‌گیرد.
        """
        if self.bale_chat_id:
            return self.bale_chat_id
        if self.leader_id and getattr(self.leader, 'bale_chat_id', ''):
            return self.leader.bale_chat_id
        return getattr(settings, 'BALE_FALLBACK_CHAT_ID', '') or ''

    @property
    def is_full(self):
        return (self.remaining_capacity or 0) <= 0

    @property
    def boarding_options(self):
        """
        شهرهایی که زائر می‌تواند از آن‌ها سوار شود: مبدأ و شهرهای بین‌راهی.

        مبدأ گاهی چند شهر را با هم نوشته («قم و تهران»)، پس از هم جدا می‌شوند.
        «و» فقط وقتی جداکننده است که دو طرفش فاصله باشد، تا «ورامین» نشکند.
        """
        parts = re.split(r'\s*(?:،|,|/|\sو\s)\s*', self.origin_city or '')
        cities = [p.strip() for p in parts if p and p.strip()]
        cities += [c.strip() for c in (self.transit_cities or []) if isinstance(c, str) and c.strip()]
        unique = []
        for city in cities:
            if city not in unique:
                unique.append(city)
        return unique

    # ── زمان‌بندی ثبت‌نام ─────────────────────────────────────────────────
    # همه‌چیز از روی ساعت سرور (تهران) حساب می‌شود و هیچ‌جا ذخیره نمی‌شود؛
    # پس «باز شدن سر ساعت» به هیچ کرون یا کار زمان‌بندی‌شده‌ای نیاز ندارد.

    @property
    def registration_opens_at(self):
        return jalali_moment(self.registration_opens_on, at=self.registration_opens_time)

    @property
    def registration_closes_at(self):
        return jalali_moment(
            self.registration_closes_on, at=self.registration_closes_time, end_of_day=True,
        )

    @property
    def departure_day(self):
        return parse_jalali_date(self.departure_date)

    def has_departed(self, now=None):
        """روز حرکت تمام شده است؛ تا پایان خود روز حرکت هنوز «گذشته» نیست."""
        day = self.departure_day
        if day is None:
            return False
        return timezone.localdate(now or timezone.now()) > day

    def registration_status(self, now=None):
        """
        وضعیت واقعی ثبت‌نام در این لحظه: open، soon یا closed.

        registration_state فقط نیت مدیر است؛ این تابع آن را با تاریخ‌ها
        ترکیب می‌کند. ترتیب مهم است: «بسته» و گذشتن زمان همیشه برنده‌اند.
        """
        now = now or timezone.now()
        if self.has_departed(now):
            return 'closed'
        if self.registration_state == 'closed':
            return 'closed'
        closes_at = self.registration_closes_at
        if closes_at and now >= closes_at:
            return 'closed'
        opens_at = self.registration_opens_at
        if opens_at:
            return 'open' if now >= opens_at else 'soon'
        # «به‌زودی» بدون تاریخ یعنی تا مدیر خودش باز نکند
        return 'soon' if self.registration_state == 'soon' else 'open'

    def is_listed(self, now=None):
        """
        آیا در فهرست سایت دیده شود؟

        کاروانی که حرکت کرده یا مهلت ثبت‌نامش تمام شده برداشته می‌شود. «بسته»ی
        دستی دیده می‌ماند (با برچسب «ثبت‌نام بسته است»)، چون آن تصمیم خود مدیر
        است و شاید بخواهد زائر کاروان را ببیند.
        """
        now = now or timezone.now()
        if self.has_departed(now):
            return False
        closes_at = self.registration_closes_at
        return not (closes_at and now >= closes_at)

    @property
    def is_bookable(self):
        """زائر فقط وقتی می‌تواند رزرو کند که ثبت‌نام همین الان باز باشد و ظرفیت بماند."""
        return self.registration_status() == 'open' and not self.is_full

    @property
    def availability_label(self):
        """برچسبی که روی کارت کاروان می‌نشیند."""
        now = timezone.now()
        if self.has_departed(now):
            return 'تاریخ حرکت گذشته'
        if self.is_full:
            return 'تکمیل شده'
        status = self.registration_status(now)
        if status == 'soon':
            if self.registration_opens_on:
                when = f'ثبت‌نام از {self.registration_opens_on}'
                if self.registration_opens_time:
                    when += f' ساعت {self.registration_opens_time:%H:%M}'
                return when
            return 'ثبت‌نام به‌زودی'
        if status == 'closed':
            return 'ثبت‌نام بسته است'
        # عدد ظرفیت روی همین برچسب می‌نشیند تا زائر برای دیدنش دنبال ردیف
        # جداگانه نگردد.
        return f'{self.remaining_capacity} نفر ظرفیت'

    @property
    def availability_tone(self):
        """رنگ برچسب: سبز باز، کهربایی به‌زودی، قرمز تکمیل، خاکستری بسته."""
        now = timezone.now()
        if self.has_departed(now):
            return 'closed'
        if self.is_full:
            return 'full'
        status = self.registration_status(now)
        if status == 'soon':
            return 'soon'
        if status == 'closed':
            return 'closed'
        return 'open'

    def clean(self):
        """
        تاریخی که سرور نتواند بخواند یعنی زمان‌بندی‌ای که بی‌صدا کار نمی‌کند —
        دقیقاً همان اتفاقی که برای «ثبت‌نام از ۹ آبان» افتاد. پس همین‌جا جلویش
        گرفته می‌شود.
        """
        errors = {}
        sample = 'به شکل ۱۴۰۵/۰۸/۰۹ بنویسید'
        if self.departure_date and parse_jalali_date(self.departure_date) is None:
            errors['departure_date'] = (
                f'تاریخ حرکت را {sample}؛ وگرنه کاروان بعد از حرکت خودکار برداشته نمی‌شود.'
            )
        for field in ('registration_opens_on', 'registration_closes_on'):
            value = getattr(self, field)
            if value and parse_jalali_date(value) is None:
                errors[field] = f'این تاریخ قابل خواندن نیست. {sample}.'
        if self.registration_opens_time and not self.registration_opens_on:
            errors['registration_opens_time'] = 'ساعت بدون تاریخ بازشدن معنا ندارد.'
        if self.registration_closes_time and not self.registration_closes_on:
            errors['registration_closes_time'] = 'ساعت بدون تاریخ پایان معنا ندارد.'
        if not errors:
            opens_at, closes_at = self.registration_opens_at, self.registration_closes_at
            if opens_at and closes_at and closes_at <= opens_at:
                errors['registration_closes_on'] = 'پایان ثبت‌نام باید بعد از شروع آن باشد.'
        if errors:
            raise ValidationError(errors)

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
