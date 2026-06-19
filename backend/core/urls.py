from django.urls import path
from .views import ContactView, NewsletterView, PrayerTimesView

urlpatterns = [
    path('contacts', ContactView.as_view(), name='contact'),
    path('newsletters', NewsletterView.as_view(), name='newsletter'),
    path('prayer-times', PrayerTimesView.as_view(), name='prayer_times'),
]
