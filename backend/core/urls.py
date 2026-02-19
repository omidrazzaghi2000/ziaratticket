from django.urls import path
from .views import ContactView, NewsletterView

urlpatterns = [
    path('contacts', ContactView.as_view(), name='contact'),
    path('newsletters', NewsletterView.as_view(), name='newsletter'),
]
