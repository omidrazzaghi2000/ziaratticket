from django.urls import path
from .views import BaleWebhookView, ContactView, NewsletterView, PrayerTimesView

urlpatterns = [
    path('contacts', ContactView.as_view(), name='contact'),
    path('newsletters', NewsletterView.as_view(), name='newsletter'),
    path('prayer-times', PrayerTimesView.as_view(), name='prayer_times'),
    # مقصد setWebhook بله؛ رمز در مسیر است (نگاه کنید به BaleWebhookView).
    path('bale/webhook/<str:secret>', BaleWebhookView.as_view(), name='bale_webhook'),
]
