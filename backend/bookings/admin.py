from django.contrib import admin
from django.utils.html import format_html
from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'main_passenger_name', 'main_passenger_phone',
        'caravan', 'passenger_count', 'formatted_total_price',
        'status_badge', 'current_step', 'is_paid', 'created_at'
    )
    list_display_links = ('id', 'main_passenger_name')
    list_filter = ('status', 'is_paid', 'is_completed', 'transportation_type', 'current_step')
    search_fields = (
        'main_passenger_name', 'main_passenger_id', 'main_passenger_phone',
        'caravan__name', 'user__phone'
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
                'main_passenger_name', 'main_passenger_id',
                'main_passenger_phone', 'main_passenger_birthdate',
            ),
        }),
        ('مسافرین', {
            'fields': ('passenger_count', 'companions_display'),
        }),
        ('صندلی‌ها', {
            'fields': ('selected_seats_display', 'transportation_type'),
        }),
        ('آدرس و درخواست‌های ویژه', {
            'fields': ('address', 'special_requests'),
        }),
        ('پرداخت', {
            'fields': ('total_price', 'is_paid', 'payment_date', 'payment_reference'),
        }),
        ('تاریخ‌های سیستمی', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def formatted_total_price(self, obj):
        return f"{obj.total_price:,} تومان"
    formatted_total_price.short_description = 'مبلغ کل'

    def status_badge(self, obj):
        colors = {
            'pending': '#f59e0b',
            'confirmed': '#3b82f6',
            'completed': '#10b981',
            'cancelled': '#ef4444',
        }
        labels = {
            'pending': 'در انتظار',
            'confirmed': 'تأیید شده',
            'completed': 'تکمیل شده',
            'cancelled': 'لغو شده',
        }
        color = colors.get(obj.status, '#6b7280')
        label = labels.get(obj.status, obj.status)
        return format_html(
            '<span style="background:{};color:white;padding:3px 8px;border-radius:4px;font-size:12px;">{}</span>',
            color, label
        )
    status_badge.short_description = 'وضعیت'

    def companions_display(self, obj):
        companions = obj.companions or []
        if not companions:
            return "بدون همراه"
        rows = ""
        for i, c in enumerate(companions, 1):
            rows += f"<tr><td>{i}</td><td>{c.get('name','')}</td><td>{c.get('nationalId','')}</td><td>{c.get('relationship','')}</td><td>{c.get('birthdate','')}</td></tr>"
        return format_html(
            '<table border="1" style="border-collapse:collapse;width:100%;">'
            '<thead><tr><th>#</th><th>نام</th><th>کد ملی</th><th>نسبت</th><th>تاریخ تولد</th></tr></thead>'
            '<tbody>{}</tbody></table>',
            format_html(rows)
        )
    companions_display.short_description = 'همراهان'

    def selected_seats_display(self, obj):
        seats = obj.selected_seats or []
        if not seats:
            return "بدون صندلی انتخابی"
        return ", ".join(str(s) for s in seats)
    selected_seats_display.short_description = 'صندلی‌های انتخابی'

    actions = ['mark_as_confirmed', 'mark_as_cancelled', 'mark_as_paid']

    def mark_as_confirmed(self, request, queryset):
        queryset.update(status='confirmed')
        self.message_user(request, "رزروهای انتخابی تأیید شدند.")
    mark_as_confirmed.short_description = "تأیید رزروهای انتخابی"

    def mark_as_cancelled(self, request, queryset):
        queryset.update(status='cancelled')
        self.message_user(request, "رزروهای انتخابی لغو شدند.")
    mark_as_cancelled.short_description = "لغو رزروهای انتخابی"

    def mark_as_paid(self, request, queryset):
        from django.utils import timezone
        queryset.update(is_paid=True, payment_date=timezone.now(), status='confirmed')
        self.message_user(request, "رزروهای انتخابی به عنوان پرداخت شده علامت‌گذاری شدند.")
    mark_as_paid.short_description = "علامت‌گذاری به عنوان پرداخت شده"
