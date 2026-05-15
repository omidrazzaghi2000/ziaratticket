from django.urls import path
from .views import FetchAllUsers, SendCodeView, VerifyCodeView, AuthStatusView, LogoutView, MeView, VerifyUserView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
urlpatterns = [
    path('auth/send-code', SendCodeView.as_view(), name='send_code'),
    path('auth/verify', VerifyCodeView.as_view(), name='verify_code'),
    path('auth/verify_user', VerifyUserView.as_view(), name='verify_user'),
    path('auth/status', AuthStatusView.as_view(), name='auth_status'),
    path('auth/logout', LogoutView.as_view(), name='auth_logout'),
    path('user', MeView.as_view(), name='me'),
    path('users', FetchAllUsers.as_view(), name='users'),

]
