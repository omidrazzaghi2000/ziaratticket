from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.utils import timezone
from django.contrib.auth import authenticate, login, logout
from .models import User
from .serializers import UserSerializer, RegisterSendCodeSerializer, VerifyCodeSerializer
import random
import datetime
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

SEND_CODE_MESSAGE_TEMPLATE = "کد تایید سامانه رزرو کاروان: {}"

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
        # پیامک نیازمند اتصال به Kavenegar. فعلاً فقط حالت دمو:
        print(SEND_CODE_MESSAGE_TEMPLATE.format(code))
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
    def get(self,request):
        users = User.objects.all();
        return Response(UserSerializer(users, many=True).data)