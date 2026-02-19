from django.urls import path
from .views import SendCodeView, VerifyCodeView, AuthStatusView, LogoutView, MeView

urlpatterns = [
    path('auth/send-code', SendCodeView.as_view(), name='send_code'),
    path('auth/verify', VerifyCodeView.as_view(), name='verify_code'),
    path('auth/status', AuthStatusView.as_view(), name='auth_status'),
    path('auth/logout', LogoutView.as_view(), name='auth_logout'),
    path('user', MeView.as_view(), name='me'),
]
