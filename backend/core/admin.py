from django.contrib import admin
from .models import Contact, Newsletter


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'phone', 'email', 'subject', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('name', 'phone', 'email', 'subject')
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)


@admin.register(Newsletter)
class NewsletterAdmin(admin.ModelAdmin):
    list_display = ('id', 'email', 'created_at')
    ordering = ('-created_at',)
    readonly_fields = ('created_at',)
