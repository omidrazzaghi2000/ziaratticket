from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.utils import timezone
from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from core import bale, bale_link
from .models import User
from .serializers import UserSerializer, RegisterSendCodeSerializer, VerifyCodeSerializer, LeaderRegisterSerializer
import random
import datetime
import requests as http_requests
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken


def _send_otp_sms(phone: str, code: str) -> bool:
    api_key = settings.KAVENEGAR_API_KEY
    try:
        response = http_requests.post(
            f"https://api.kavenegar.com/v1/{api_key}/verify/lookup.json",
            data={
                "receptor": phone,
                "template": "code",
                "token": code,
            },
            timeout=10,
        )
        return response.status_code == 200
    except Exception:
        return False

class SendCodeView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSendCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data['phone']
        full_name = serializer.validated_data.get('full_name')

        user, _ = User.objects.get_or_create(phone=phone, defaults={'full_name': full_name})
        code = str(random.randint(1000, 9999))
        user.verification_code = code
        user.code_expiry = timezone.now() + datetime.timedelta(minutes=5)
        if full_name:
            user.full_name = full_name
        user.is_verified = False
        user.save()
        _send_otp_sms(phone, code)
        return Response({"message": "کد تایید به شماره موبایل شما ارسال شد.", "phone": phone})

class VerifyCodeView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data['phone']
        code = serializer.validated_data['code']
        try:
            user = User.objects.get(phone=phone)
        except User.DoesNotExist:
            return Response({"message": "کاربر یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        if user.verification_code != code:
            return Response({"message": "کد تایید صحیح نیست."}, status=status.HTTP_400_BAD_REQUEST)
        if user.code_expiry is None or user.code_expiry < timezone.now():
            return Response({"message": "کد تایید منقضی شده است."}, status=status.HTTP_400_BAD_REQUEST)
        user.is_verified = True
        user.verification_code = None
        user.code_expiry = None

        refresh = RefreshToken.for_user(user)

        user.save()
        # login(request, user)  # واردکردن کاربر به session
        return Response({"message": "ورود با موفقیت انجام شد.", "user": UserSerializer(user).data,"refresh": str(refresh),
            "access": str(refresh.access_token),})

class VerifyUserView(APIView):
    def post(self, request):
        serializer = VerifyCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data['phone']
        code = serializer.validated_data['code']
        try:
            user = User.objects.get(phone=phone)
        except User.DoesNotExist:
            return Response({"message": "کاربر یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        
        user.is_verified = True
        user.verification_code = None
        user.code_expiry = None
        user.save()
        login(request, user)  # واردکردن کاربر به session
        return Response({"message": "ورود با موفقیت انجام شد.", "user": UserSerializer(user).data})

class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response({"message": "خروج با موفقیت انجام شد."})

class AuthStatusView(APIView):
    """
    «آیا وارد شده‌ام؟» — خودِ سؤال نیاز به ورود ندارد.
    بدون AllowAny، پیش‌فرض پروژه (IsAuthenticated) جلوی درخواست را می‌گرفت و
    ۴۰۱ برمی‌گرداند، یعنی شاخه‌ی isAuthenticated=False هیچ‌وقت اجرا نمی‌شد و
    هر بازدیدکننده‌ی مهمان یک خطای قرمز در کنسول می‌دید.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if request.user.is_authenticated:
            return Response({"isAuthenticated": True, "userId": request.user.id})
        return Response({"isAuthenticated": False})

class MeView(APIView):
    def get(self, request):
        if not request.user.is_authenticated:
            return Response({"message": "نیاز به ورود دارید."}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(UserSerializer(request.user).data)
    

class FetchAllUsers(APIView):
    def get(self, request):
        users = User.objects.all()
        return Response(UserSerializer(users, many=True).data)


class LeaderRegisterView(APIView):
    """Register/update the current user as a caravan leader (requires prior OTP login)"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = LeaderRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.full_name = serializer.validated_data['full_name']
        user.national_id = serializer.validated_data['national_id']
        user.birth_certificate_no = serializer.validated_data['birth_certificate_no']
        user.address = serializer.validated_data['address']
        user.messaging_apps = serializer.validated_data.get('messaging_apps', [])
        user.leader_bio = serializer.validated_data.get('leader_bio', '')
        user.role = 'caravan_leader'
        user.is_leader_approved = True
        user.save()
        return Response({
            "message": "ثبت‌نام مدیر کاروان با موفقیت انجام شد. اکنون می‌توانید کاروان ثبت کنید.",
            "user": UserSerializer(user).data,
        })


class UpdateProfileView(APIView):
    """Update user profile"""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        user = request.user
        allowed = {'full_name', 'national_id', 'birth_certificate_no', 'address', 'messaging_apps', 'leader_bio'}
        for key, val in request.data.items():
            if key in allowed:
                setattr(user, key, val)
        user.save()
        return Response(UserSerializer(user).data)


# ─── اتصال به ربات بله ────────────────────────────────────────────────────────

BALE_NOT_LEADER_MESSAGE = 'این بخش فقط برای مدیران کاروان تأییدشده است.'


def _bale_connection_payload(user):
    """وضعیت اتصال بله‌ی کاربر، برای نمایش در داشبورد."""
    bot_username = getattr(settings, 'BALE_BOT_USERNAME', '') or ''
    payload = {
        'connected': bool(user.bale_chat_id),
        'chat_id': user.bale_chat_id or '',
        # اگر توکن یا وب‌هوک روی سرور تنظیم نشده باشد، داشبورد باید همین را بگوید
        # تا مدیر کاروان دنبال کدی نگردد که هیچ‌وقت جواب نمی‌دهد.
        'bot_configured': bale.is_configured() and bool(getattr(settings, 'BALE_WEBHOOK_SECRET', '')),
        'bot_username': bot_username,
        'bot_url': f'https://ble.ir/{bot_username}' if bot_username else '',
        'code_ttl_minutes': bale_link.CODE_TTL_MINUTES,
        'code': '',
        'code_expires_at': None,
    }
    if bale_link.has_active_code(user):
        payload['code'] = user.bale_connect_code
        payload['code_expires_at'] = user.bale_connect_code_expiry
    return payload


class BaleConnectionView(APIView):
    """
    اتصال حساب مدیر کاروان به ربات بله، از داشبورد خودش.

    ``GET`` وضعیت، ``POST`` یک کد اتصال تازه، ``DELETE`` قطع اتصال.
    مدیر کاروان کد را در بله به ربات می‌فرستد و وب‌هوک شناسه‌ی چت را ثبت می‌کند
    (نگاه کنید به ``core/bale_link.py``)؛ ادمین هیچ کاری لازم نیست بکند.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.user.is_caravan_leader:
            return Response({"message": BALE_NOT_LEADER_MESSAGE}, status=status.HTTP_403_FORBIDDEN)
        return Response(_bale_connection_payload(request.user))

    def post(self, request):
        if not request.user.is_caravan_leader:
            return Response({"message": BALE_NOT_LEADER_MESSAGE}, status=status.HTTP_403_FORBIDDEN)
        bale_link.issue_connect_code(request.user)
        payload = _bale_connection_payload(request.user)
        payload['message'] = 'کد اتصال ساخته شد. آن را در بله برای ربات بفرستید.'
        return Response(payload)

    def delete(self, request):
        if not request.user.is_caravan_leader:
            return Response({"message": BALE_NOT_LEADER_MESSAGE}, status=status.HTTP_403_FORBIDDEN)
        bale_link.disconnect(request.user)
        payload = _bale_connection_payload(request.user)
        payload['message'] = 'اتصال بله قطع شد؛ از این پس اطلاع رزرو در بله دریافت نمی‌کنید.'
        return Response(payload)


class BaleTestMessageView(APIView):
    """ارسال یک پیام آزمایشی به چت بله‌ی مدیر کاروان، برای اطمینان از درستی اتصال."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if not user.is_caravan_leader:
            return Response({"message": BALE_NOT_LEADER_MESSAGE}, status=status.HTTP_403_FORBIDDEN)
        if not user.bale_chat_id:
            return Response(
                {"message": "حساب شما هنوز به ربات بله وصل نشده است."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not bale.is_configured():
            return Response(
                {"message": "ربات بله روی سرور تنظیم نشده است؛ با پشتیبانی تماس بگیرید."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        sent = bale.send_message(
            user.bale_chat_id,
            'پیام آزمایشی سامانه کاروان کربلا ✅\nاطلاع رزروهای شما به همین چت فرستاده می‌شود.',
        )
        if not sent:
            return Response(
                {"message": "ارسال پیام آزمایشی ناموفق بود. اتصال را دوباره برقرار کنید."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        return Response({"message": "پیام آزمایشی به بله فرستاده شد."})
