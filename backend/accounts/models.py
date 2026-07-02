from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager


class UserManager(BaseUserManager):
    def create_user(self, phone, password=None, **extra_fields):
        if not phone:
            raise ValueError('شماره موبایل الزامی است')
        user = self.model(phone=phone, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, phone, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(phone, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('user', 'زایر'),
        ('caravan_leader', 'مدیر کاروان'),
    ]

    phone = models.CharField(max_length=15, unique=True, verbose_name='شماره موبایل')
    full_name = models.CharField(max_length=120, blank=True, null=True, verbose_name='نام و نام خانوادگی')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user', verbose_name='نقش')

    # Caravan leader profile fields
    national_id = models.CharField(max_length=15, blank=True, null=True, verbose_name='کد ملی')
    birth_certificate_no = models.CharField(max_length=20, blank=True, null=True, verbose_name='شماره شناسنامه')
    address = models.TextField(blank=True, null=True, verbose_name='آدرس')
    messaging_apps = models.JSONField(default=list, blank=True, verbose_name='پیام‌رسان‌ها')
    is_leader_approved = models.BooleanField(default=False, verbose_name='تأیید شده به عنوان مدیر کاروان')
    leader_bio = models.TextField(blank=True, null=True, verbose_name='معرفی مدیر کاروان')

    # OTP
    verification_code = models.CharField(max_length=8, blank=True, null=True)
    code_expiry = models.DateTimeField(blank=True, null=True)
    is_verified = models.BooleanField(default=False)

    date_joined = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ عضویت')
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()
    USERNAME_FIELD = 'phone'
    REQUIRED_FIELDS = []

    class Meta:
        verbose_name = 'کاربر'
        verbose_name_plural = 'کاربران'

    def __str__(self):
        return f"{self.full_name or self.phone}"

    @property
    def is_caravan_leader(self):
        return self.role == 'caravan_leader' and self.is_leader_approved
