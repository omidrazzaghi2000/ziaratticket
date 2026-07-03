from django.contrib import admin
from django.utils.html import format_html
from .models import Caravan, CaravanPhoto, CaravanReview


class CaravanPhotoInline(admin.TabularInline):
    model = CaravanPhoto
    extra = 1
    fields = ('photo', 'caption', 'category', 'order', 'photo_preview')
    readonly_fields = ('photo_preview',)

    def photo_preview(self, obj):
        if obj.photo:
            return format_html('<img src="{}" style="max-width:120px;max-height:80px;border-radius:6px;" />', obj.photo.url)
        return "—"
    photo_preview.short_description = 'پیش‌نمایش'


@admin.register(CaravanPhoto)
class CaravanPhotoAdmin(admin.ModelAdmin):
    list_display = ('id', 'caravan', 'category', 'caption', 'order')
    list_filter = ('category',)
    search_fields = ('caravan__name', 'caption')


@admin.register(Caravan)
class CaravanAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'name', 'destination_badge', 'departure_date', 'duration',
        'transport_badge', 'formatted_price', 'capacity', 'remaining_capacity',
        'status_badge', 'popular',
    )
    list_display_links = ('id', 'name')
    list_filter = ('destination', 'transportation_type', 'status', 'popular', 'has_insurance')
    search_fields = ('name', 'manager', 'description', 'origin_city')
    list_editable = ('popular',)
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at', 'caravan_preview')
    actions = ['approve_caravans', 'reject_caravans', 'mark_as_popular', 'mark_as_not_popular']

    inlines = [CaravanPhotoInline]

    fieldsets = (
        ('اطلاعات اصلی کاروان', {
            'fields': ('name', 'destination', 'description', 'status', 'popular', 'special_tag'),
        }),
        ('مدیر کاروان', {
            'fields': ('leader', 'manager', 'contact_phone', 'leader_messaging_apps'),
        }),
        ('تاریخ و مدت سفر', {
            'fields': ('departure_date', 'duration', 'start_date', 'end_date'),
        }),
        ('حمل‌ونقل و مسیر', {
            'fields': ('transportation_type', 'origin_city', 'transit_cities'),
        }),
        ('اقامتگاه', {
            'fields': ('accommodation_type', 'accommodation_name', 'accommodation_city', 'accommodation_distance'),
        }),
        ('خدمات و امکانات', {
            'fields': ('meal_breakfast', 'meal_lunch', 'meal_dinner', 'has_insurance'),
        }),
        ('قیمت و ظرفیت', {
            'fields': ('price', 'capacity', 'remaining_capacity'),
        }),
        ('برنامه سفر و قوانین', {
            'fields': ('itinerary', 'rules'),
            'classes': ('collapse',),
        }),
        ('تصویر', {
            'fields': ('image', 'image_url', 'caravan_preview'),
        }),
        ('تاریخ‌های سیستمی', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def destination_badge(self, obj):
        colors = {
            'mashhad': '#1a6b3a',
            'karbala': '#b45309',
            'hajj_umrah': '#7c3aed',
            'qom_jamkaran': '#0369a1',
        }
        color = colors.get(obj.destination, '#6b7280')
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:12px;font-size:12px;">{}</span>',
            color, obj.get_destination_display()
        )
    destination_badge.short_description = 'مقصد'

    def transport_badge(self, obj):
        icons = {'bus': '🚌', 'train': '🚂', 'airplane': '✈️', 'combined': '🔀'}
        icon = icons.get(obj.transportation_type, '🚌')
        return format_html('{} {}', icon, obj.get_transportation_type_display())
    transport_badge.short_description = 'حمل‌ونقل'

    def status_badge(self, obj):
        colors = {'pending': '#f59e0b', 'approved': '#10b981', 'rejected': '#ef4444'}
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:12px;font-size:12px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'وضعیت'

    def formatted_price(self, obj):
        return f"{obj.price:,} تومان"
    formatted_price.short_description = 'قیمت'

    def caravan_preview(self, obj):
        url = None
        if obj.image:
            url = obj.image.url
        elif obj.image_url:
            url = obj.image_url
        if url:
            return format_html('<img src="{}" style="max-width:200px;max-height:150px;border-radius:8px;" />', url)
        return "بدون تصویر"
    caravan_preview.short_description = 'پیش‌نمایش'

    def approve_caravans(self, request, queryset):
        queryset.update(status='approved')
        self.message_user(request, f"{queryset.count()} کاروان تأیید شد.")
    approve_caravans.short_description = "✅ تأیید کاروان‌های انتخابی"

    def reject_caravans(self, request, queryset):
        queryset.update(status='rejected')
        self.message_user(request, f"{queryset.count()} کاروان رد شد.")
    reject_caravans.short_description = "❌ رد کاروان‌های انتخابی"

    def mark_as_popular(self, request, queryset):
        queryset.update(popular=True)
        self.message_user(request, "کاروان‌های انتخابی به عنوان محبوب علامت‌گذاری شدند.")
    mark_as_popular.short_description = "⭐ علامت‌گذاری به عنوان محبوب"

    def mark_as_not_popular(self, request, queryset):
        queryset.update(popular=False)
        self.message_user(request, "کاروان‌های انتخابی از لیست محبوب خارج شدند.")
    mark_as_not_popular.short_description = "حذف از لیست محبوب"


@admin.register(CaravanReview)
class CaravanReviewAdmin(admin.ModelAdmin):
    list_display = ('id', 'caravan', 'reviewer_name', 'rating', 'is_submitted', 'submitted_at')
    list_filter = ('is_submitted', 'rating', 'caravan')
    search_fields = ('reviewer_name', 'comment', 'caravan__name')
    readonly_fields = ('token', 'created_at', 'submitted_at')
