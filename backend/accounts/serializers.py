from rest_framework import serializers
from core.digits import NormalizeDigitsMixin
from .models import User


class UserSerializer(NormalizeDigitsMixin, serializers.ModelSerializer):
    numeric_fields = ('phone', 'national_id', 'birth_certificate_no')

    class Meta:
        model = User
        fields = [
            'id', 'phone', 'full_name', 'role', 'is_verified',
            'national_id', 'birth_certificate_no', 'address',
            'messaging_apps', 'is_leader_approved', 'leader_bio',
            'date_joined',
        ]
        read_only_fields = ['id', 'is_verified', 'is_leader_approved', 'date_joined']


class RegisterSendCodeSerializer(NormalizeDigitsMixin, serializers.Serializer):
    # شماره ممکن است با ارقام فارسی وارد شود
    numeric_fields = ('phone',)

    phone = serializers.CharField(max_length=15)
    full_name = serializers.CharField(max_length=120, allow_blank=True, required=False)


class VerifyCodeSerializer(NormalizeDigitsMixin, serializers.Serializer):
    # هم شماره و هم کد تأیید ممکن است فارسی وارد شوند
    numeric_fields = ('phone', 'code')

    phone = serializers.CharField(max_length=15)
    code = serializers.CharField(max_length=8)


class LeaderRegisterSerializer(NormalizeDigitsMixin, serializers.Serializer):
    numeric_fields = ('national_id', 'birth_certificate_no')

    full_name = serializers.CharField(max_length=120)
    national_id = serializers.CharField(max_length=15)
    birth_certificate_no = serializers.CharField(max_length=20)
    address = serializers.CharField()
    messaging_apps = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    leader_bio = serializers.CharField(required=False, allow_blank=True)
