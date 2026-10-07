from rest_framework import serializers
from .models import Booking


NATIONAL_ID_ERROR = "کد ملی باید ۱۰ رقم باشد."


def normalize_digits(value):
    """تبدیل ارقام فارسی/عربی به لاتین."""
    if not value:
        return value
    table = str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789')
    return str(value).translate(table).strip()


def validate_national_id(value):
    value = normalize_digits(value)
    if not value or not value.isdigit() or len(value) != 10:
        raise serializers.ValidationError(NATIONAL_ID_ERROR)
    return value


def validate_mobile(value):
    value = normalize_digits(value)
    if not value or not value.isdigit() or len(value) != 11 or not value.startswith('09'):
        raise serializers.ValidationError("شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.")
    return value


class BookingStep1Serializer(serializers.Serializer):
    """ثبت‌نام ساده: نام، نام خانوادگی، کد ملی و موبایل — برای همه سفرها یکسان است."""
    caravan_id = serializers.IntegerField()
    first_name = serializers.CharField(max_length=50)
    last_name = serializers.CharField(max_length=50)
    main_passenger_id = serializers.CharField(max_length=20)
    main_passenger_phone = serializers.CharField(max_length=20)
    passenger_count = serializers.IntegerField(min_value=1, max_value=10)

    def validate_main_passenger_id(self, value):
        return validate_national_id(value)

    def validate_main_passenger_phone(self, value):
        return validate_mobile(value)


class CompanionSerializer(serializers.Serializer):
    """همراه: نام، نام خانوادگی، کد ملی و شماره موبایل (اختیاری)."""
    first_name = serializers.CharField(max_length=50)
    last_name = serializers.CharField(max_length=50)
    national_id = serializers.CharField(max_length=20)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')

    def validate_national_id(self, value):
        return validate_national_id(value)

    def validate_phone(self, value):
        value = normalize_digits(value)
        if not value:
            return ''
        return validate_mobile(value)


class BookingStep2Serializer(serializers.Serializer):
    companions = serializers.ListField(child=serializers.DictField())


class BookingStep3Serializer(serializers.Serializer):
    special_requests = serializers.CharField(allow_blank=True, required=False)
    selected_seats = serializers.ListField(child=serializers.IntegerField(), required=False)


class BookingSerializer(serializers.ModelSerializer):
    caravan_name = serializers.SerializerMethodField()
    caravan_departure_date = serializers.SerializerMethodField()
    caravan_transportation_type = serializers.SerializerMethodField()
    caravan_transportation_display = serializers.SerializerMethodField()
    caravan_train_type_display = serializers.SerializerMethodField()
    caravan_destination = serializers.SerializerMethodField()
    caravan_destination_display = serializers.SerializerMethodField()
    caravan_is_international = serializers.SerializerMethodField()
    caravan_is_ground_transport = serializers.SerializerMethodField()
    caravan_seat_selection_active = serializers.SerializerMethodField()
    caravan_bus_type = serializers.SerializerMethodField()
    caravan_capacity = serializers.SerializerMethodField()
    caravan_leader_phone = serializers.SerializerMethodField()
    caravan_leader_name = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = '__all__'

    def get_caravan_name(self, obj):
        return obj.caravan.name if obj.caravan else None

    def get_caravan_departure_date(self, obj):
        return obj.caravan.departure_date if obj.caravan else None

    def get_caravan_transportation_type(self, obj):
        return obj.caravan.transportation_type if obj.caravan else None

    def get_caravan_transportation_display(self, obj):
        return obj.caravan.get_transportation_type_display() if obj.caravan else None

    def get_caravan_train_type_display(self, obj):
        # «قطار» به‌تنهایی گویا نیست؛ نوع واگن هم در رسید می‌آید
        if obj.caravan and obj.caravan.train_type:
            return obj.caravan.get_train_type_display()
        return None

    def get_caravan_destination(self, obj):
        return obj.caravan.destination if obj.caravan else None

    def get_caravan_destination_display(self, obj):
        return obj.caravan.get_destination_display() if obj.caravan else None

    def get_caravan_is_international(self, obj):
        return obj.caravan.is_international if obj.caravan else False

    def get_caravan_is_ground_transport(self, obj):
        return obj.caravan.is_ground_transport if obj.caravan else False

    def get_caravan_seat_selection_active(self, obj):
        return obj.caravan.seat_selection_active if obj.caravan else False

    def get_caravan_bus_type(self, obj):
        return obj.caravan.bus_type if obj.caravan else None

    def get_caravan_capacity(self, obj):
        return obj.caravan.capacity if obj.caravan else None

    def get_caravan_leader_phone(self, obj):
        if obj.caravan and obj.caravan.leader:
            return obj.caravan.contact_phone or obj.caravan.leader.phone
        return obj.caravan.contact_phone if obj.caravan else None

    def get_caravan_leader_name(self, obj):
        if obj.caravan and obj.caravan.leader:
            return obj.caravan.leader.full_name or obj.caravan.leader.phone
        return obj.caravan.manager if obj.caravan else None
