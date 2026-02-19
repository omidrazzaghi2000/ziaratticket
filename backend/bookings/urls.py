from django.urls import path
from .views import (
    BookingStep1View, BookingStep2View, BookingStep3View, 
    CompleteBookingView, UserBookingsView, BookingDetailView
)

urlpatterns = [
    path('bookings/step1', BookingStep1View.as_view(), name='booking_step1'),
    path('bookings/<int:id>/step2', BookingStep2View.as_view(), name='booking_step2'),
    path('bookings/<int:id>/step3', BookingStep3View.as_view(), name='booking_step3'),
    path('bookings/<int:id>/complete', CompleteBookingView.as_view(), name='booking_complete'),
    path('bookings/user', UserBookingsView.as_view(), name='user_bookings'),
    path('bookings/<int:id>', BookingDetailView.as_view(), name='booking_detail'),
]
