from django.contrib import admin
from django.utils.html import format_html
from .models import Caravan


@admin.register(Caravan)
class CaravanAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'name', 'departure_date', 'duration', 'transportation_type',
        'formatted_price', 'capacity', 'remaining_capacity', 'popular', 'special_tag'
    )
    list_display_links = ('id', 'name')
    list_filter = ('transportation_type', 'popular', 'departure_date')
    search_fields = ('name', 'manager', 'description', 'accommodation_type')
    list_editable = ('popular',)
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at', 'caravan_preview')

    fieldsets = (
        ('اطلاعات اصلی کاروان', {
            'fields': ('name', 'manager', 'description', 'image_url', 'caravan_preview'),
        }),
        ('تاریخ و مدت سفر', {
            'fields': ('departure_date', 'duration', 'start_date', 'end_date'),
        }),
        ('نوع حمل‌ونقل و اقامتگاه', {
            'fields': ('transportation_type', 'accommodation_type', 'accommodation_distance'),
        }),
        ('قیمت و ظرفیت', {
            'fields': ('price', 'capacity', 'remaining_capacity'),
        }),
        ('ویژگی‌های خاص', {
            'fields': ('popular', 'special_tag'),
        }),
        ('تاریخ‌های سیستمی', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    def formatted_price(self, obj):
        return f"{obj.price:,} تومان"
    formatted_price.short_description = 'قیمت'

    def caravan_preview(self, obj):
        if obj.image_url:
            return format_html(
                '<img src="{}" style="max-width:200px; max-height:150px; border-radius:8px;" />',
                obj.image_url
            )
        return "بدون تصویر"
    caravan_preview.short_description = 'پیش‌نمایش تصویر'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related()

    actions = ['mark_as_popular', 'mark_as_not_popular']

    def mark_as_popular(self, request, queryset):
        queryset.update(popular=True)
        self.message_user(request, "کاروان‌های انتخابی به عنوان محبوب علامت‌گذاری شدند.")
    mark_as_popular.short_description = "علامت‌گذاری به عنوان محبوب"

    def mark_as_not_popular(self, request, queryset):
        queryset.update(popular=False)
        self.message_user(request, "کاروان‌های انتخابی از لیست محبوب خارج شدند.")
    mark_as_not_popular.short_description = "حذف از لیست محبوب"
