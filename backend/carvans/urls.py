from django.urls import path
from .views import (
    CaravanListView, CaravanDetailView,
    LeaderCaravanListView, LeaderCaravanDetailView, LeaderCaravanPhotosView,
    LeaderBookingsView, LeaderBookingDetailView, LeaderBookingsExportView,
    CaravanStatsView, CaravanReviewsView, ReviewByTokenView, LeaderGenerateReviewLinkView,
)

urlpatterns = [
    path('caravans', CaravanListView.as_view(), name='caravan-list'),
    path('caravans/<int:id>', CaravanDetailView.as_view(), name='caravan-detail'),
    path('caravans/<int:id>/reviews', CaravanReviewsView.as_view(), name='caravan-reviews'),
    path('stats', CaravanStatsView.as_view(), name='caravan-stats'),

    # Review via token (public link sent to pilgrim)
    path('review/<uuid:token>', ReviewByTokenView.as_view(), name='review-by-token'),

    # Caravan leader portal
    path('leader/caravans', LeaderCaravanListView.as_view(), name='leader-caravan-list'),
    path('leader/caravans/<int:pk>', LeaderCaravanDetailView.as_view(), name='leader-caravan-detail'),
    path('leader/caravans/<int:pk>/photos', LeaderCaravanPhotosView.as_view(), name='leader-caravan-photos'),
    path('leader/bookings', LeaderBookingsView.as_view(), name='leader-bookings'),
    path('leader/bookings/export', LeaderBookingsExportView.as_view(), name='leader-bookings-export'),
    path('leader/bookings/<int:pk>', LeaderBookingDetailView.as_view(), name='leader-booking-detail'),
    path('leader/bookings/<int:pk>/review-link', LeaderGenerateReviewLinkView.as_view(), name='leader-review-link'),
]
