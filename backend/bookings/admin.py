from django.contrib import admin
from django.utils.html import format_html
from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'main_passenger_name', 'main_passenger_phone',
        'caravan', 'passenger_count', 'formatted_total_price',
        'status_badge', 'is_paid', 'created_at'
    )
    list_display_links = ('id', 'main_passenger_name')
    list_filter = ('status', 'is_paid', 'is_completed', 'transportation_type')
    search_fields = (
        'main_passenger_name', 'main_passenger_id', 'main_passenger_phone',
        'main_passenger_passport_no', 'caravan__name', 'user__phone'
    )
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at', 'companions_display', 'selected_seats_display')
    date_hierarchy = 'created_at'

    fieldsets = (
        ('اطلاعات رزرو', {
            'fields': ('user', 'caravan', 'status', 'current_step', 'is_completed'),
        }),
        ('اطلاعات سرپرست', {
            'fields': (
                'main_passenger_name', 'main_passenger_id', 'main_passenger_phone',
                'main_passenger_birthdate', 'main_passenger_emergency_phone',
                'main_passenger_messaging_apps',
            ),
        }),
        ('اطلاعات گذرنامه (سفرهای خارجی)', {
            'fields': (
                'main_passenger_passport_no', 'main_passenger_foreign_name',
                'main_passenger_foreign_lastname',
            ),
            'classes': ('collapse',),
        }),
        ('همراهان', {
            'fields': ('passenger_count', 'companions_display'),
        }),
        ('صندلی‌ها', {
            'fields': ('selected_seats_display',),
        }),
        ('درخواست‌های خاص', {
            'fields': ('special_requests',),
        }),
        ('پرداخت', {
            'fields': ('total_price', 'is_paid', 'payment_date', 'payment_reference'),
        }),
        ('تاریخ‌های سیستمی', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    actions = ['mark_as_confirmed', 'mark_as_cancelled', 'mark_as_paid']

    def formatted_total_price(self, obj):
        return f"{obj.total_price:,} تومان"
    formatted_total_price.short_description = 'مبلغ کل'

    def status_badge(self, obj):
        colors = {
            'pending': '#f59e0b',
            'confirmed': '#10b981',
            'cancelled': '#ef4444',
            'completed': '#3b82f6',
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:12px;font-size:12px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'وضعیت'

    def companions_display(self, obj):
        if not obj.companions:
            return "بدون همراه"
        rows = "".join(
            f"<tr><td>{c.get('name','')}</td><td>{c.get('nationalId','') or c.get('passportNo','')}</td>"
            f"<td>{c.get('relationship','')}</td><td>{c.get('phone','')}</td></tr>"
            for c in obj.companions
        )
        return format_html(
            '<table style="font-size:13px;"><thead><tr><th>نام</th><th>کد ملی/گذرنامه</th><th>نسبت</th><th>موبایل</th></tr></thead>'
            '<tbody>{}</tbody></table>', rows
        )
    companions_display.short_description = 'لیست همراهان'

    def selected_seats_display(self, obj):
        seats = obj.selected_seats or []
        if not seats:
            return "صندلی انتخاب نشده"
        return format_html(
            '<div style="display:flex;flex-wrap:wrap;gap:4px;">{}</div>',
            format_html(''.join(
                f'<span style="background:#10b981;color:#fff;padding:2px 8px;border-radius:8px;font-size:13px;">{s}</span>'
                for s in seats
            ))
        )
    selected_seats_display.short_description = 'صندلی‌های انتخاب‌شده'

    def mark_as_confirmed(self, request, queryset):
        queryset.update(status='confirmed')
        self.message_user(request, "رزروهای انتخابی تأیید شدند.")
    mark_as_confirmed.short_description = "✅ تأیید رزروها"

    def mark_as_cancelled(self, request, queryset):
        queryset.update(status='cancelled')
        self.message_user(request, "رزروهای انتخابی لغو شدند.")
    mark_as_cancelled.short_description = "❌ لغو رزروها"

    def mark_as_paid(self, request, queryset):
        from django.utils import timezone
        queryset.update(is_paid=True, payment_date=timezone.now(), status='confirmed')
        self.message_user(request, "رزروهای انتخابی پرداخت‌شده علامت‌گذاری شدند.")
    mark_as_paid.short_description = "💰 علامت‌گذاری به عنوان پرداخت‌شده"
