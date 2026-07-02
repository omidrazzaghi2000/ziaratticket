from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('id', 'phone', 'full_name', 'role_badge', 'is_leader_approved', 'is_verified', 'is_staff', 'is_active', 'date_joined')
    list_display_links = ('id', 'phone')
    list_filter = ('role', 'is_verified', 'is_leader_approved', 'is_staff', 'is_active')
    search_fields = ('phone', 'full_name', 'national_id')
    ordering = ('-date_joined',)
    readonly_fields = ('date_joined',)
    actions = ['approve_leaders', 'revoke_leader_approval']

    fieldsets = (
        ('اطلاعات حساب', {
            'fields': ('phone', 'password', 'role'),
        }),
        ('اطلاعات شخصی', {
            'fields': ('full_name', 'national_id', 'birth_certificate_no', 'address'),
        }),
        ('مدیر کاروان', {
            'fields': ('is_leader_approved', 'messaging_apps', 'leader_bio'),
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
            'fields': ('phone', 'full_name', 'role', 'password1', 'password2', 'is_staff'),
        }),
    )

    filter_horizontal = ('groups', 'user_permissions')

    def role_badge(self, obj):
        if obj.role == 'caravan_leader':
            color = '#10b981' if obj.is_leader_approved else '#f59e0b'
            label = 'مدیر کاروان ✓' if obj.is_leader_approved else 'مدیر (در انتظار)'
        else:
            color = '#6b7280'
            label = 'زایر'
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:12px;font-size:12px;">{}</span>',
            color, label
        )
    role_badge.short_description = 'نقش'

    def approve_leaders(self, request, queryset):
        updated = queryset.filter(role='caravan_leader').update(is_leader_approved=True)
        self.message_user(request, f"{updated} مدیر کاروان تأیید شد.")
    approve_leaders.short_description = "✅ تأیید به عنوان مدیر کاروان"

    def revoke_leader_approval(self, request, queryset):
        updated = queryset.update(is_leader_approved=False)
        self.message_user(request, f"تأیید {updated} مدیر کاروان لغو شد.")
    revoke_leader_approval.short_description = "❌ لغو تأیید مدیر کاروان"
