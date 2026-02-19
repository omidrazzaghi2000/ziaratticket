from django.urls import path
from .views import CaravanListView, CaravanDetailView

urlpatterns = [
    path('caravans', CaravanListView.as_view(), name='caravan-list'),
    path('caravans/<int:id>', CaravanDetailView.as_view(), name='caravan-detail'),
]
