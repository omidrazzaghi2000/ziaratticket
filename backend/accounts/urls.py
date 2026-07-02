from django.urls import path
from .views import (
    FetchAllUsers, SendCodeView, VerifyCodeView,
    AuthStatusView, LogoutView, MeView, VerifyUserView,
    LeaderRegisterView, UpdateProfileView,
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('auth/send-code', SendCodeView.as_view(), name='send_code'),
    path('auth/verify', VerifyCodeView.as_view(), name='verify_code'),
    path('auth/verify_user', VerifyUserView.as_view(), name='verify_user'),
    path('auth/status', AuthStatusView.as_view(), name='auth_status'),
    path('auth/logout', LogoutView.as_view(), name='auth_logout'),
    path('auth/refresh', TokenRefreshView.as_view(), name='token_refresh'),
    path('user', MeView.as_view(), name='me'),
    path('user/update', UpdateProfileView.as_view(), name='update_profile'),
    path('users', FetchAllUsers.as_view(), name='users'),
    path('leader/register', LeaderRegisterView.as_view(), name='leader_register'),
]
