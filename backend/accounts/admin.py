from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('id', 'phone', 'full_name', 'is_verified', 'is_staff', 'is_active', 'date_joined')
    list_display_links = ('id', 'phone')
    list_filter = ('is_verified', 'is_staff', 'is_active')
    search_fields = ('phone', 'full_name')
    ordering = ('-date_joined',)
    readonly_fields = ('date_joined',)

    fieldsets = (
        ('اطلاعات حساب', {
            'fields': ('phone', 'password'),
        }),
        ('اطلاعات شخصی', {
            'fields': ('full_name',),
        }),
        ('وضعیت تأیید', {
            'fields': ('is_verified', 'verification_code', 'code_expiry'),
        }),
        ('دسترسی‌ها', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        ('تاریخ‌ها', {
            'fields': ('date_joined', 'last_login'),
            'classes': ('collapse',),
        }),
    )

    add_fieldsets = (
        ('ایجاد کاربر جدید', {
            'classes': ('wide',),
            'fields': ('phone', 'full_name', 'password1', 'password2', 'is_staff'),
        }),
    )

    filter_horizontal = ('groups', 'user_permissions')
