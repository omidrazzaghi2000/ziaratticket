from rest_framework import serializers
from .models import Booking


class BookingStep1Serializer(serializers.Serializer):
    caravan_id = serializers.IntegerField()
    main_passenger_name = serializers.CharField(max_length=100)
    main_passenger_id = serializers.CharField(max_length=20, required=False, allow_blank=True)
    main_passenger_phone = serializers.CharField(max_length=20)
    main_passenger_birthdate = serializers.CharField(max_length=15)
    main_passenger_emergency_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    main_passenger_messaging_apps = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    main_passenger_passport_no = serializers.CharField(max_length=20, required=False, allow_blank=True)
    main_passenger_foreign_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    main_passenger_foreign_lastname = serializers.CharField(max_length=100, required=False, allow_blank=True)
    passenger_count = serializers.IntegerField(min_value=1, max_value=10)


class CompanionSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    national_id = serializers.CharField(max_length=20, required=False, allow_blank=True)
    passport_no = serializers.CharField(max_length=20, required=False, allow_blank=True)
    foreign_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    foreign_lastname = serializers.CharField(max_length=100, required=False, allow_blank=True)
    relationship = serializers.CharField(max_length=30)
    birthdate = serializers.CharField(max_length=15)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)


class BookingStep2Serializer(serializers.Serializer):
    companions = serializers.ListField(child=serializers.DictField())


class BookingStep3Serializer(serializers.Serializer):
    special_requests = serializers.CharField(allow_blank=True, required=False)
    selected_seats = serializers.ListField(child=serializers.IntegerField(), required=False)


class BookingSerializer(serializers.ModelSerializer):
    caravan_name = serializers.SerializerMethodField()
    caravan_departure_date = serializers.SerializerMethodField()
    caravan_transportation_type = serializers.SerializerMethodField()
    caravan_destination = serializers.SerializerMethodField()
    caravan_destination_display = serializers.SerializerMethodField()
    caravan_is_international = serializers.SerializerMethodField()
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

    def get_caravan_destination(self, obj):
        return obj.caravan.destination if obj.caravan else None

    def get_caravan_destination_display(self, obj):
        return obj.caravan.get_destination_display() if obj.caravan else None

    def get_caravan_is_international(self, obj):
        return obj.caravan.is_international if obj.caravan else False

    def get_caravan_leader_phone(self, obj):
        if obj.caravan and obj.caravan.leader:
            return obj.caravan.contact_phone or obj.caravan.leader.phone
        return obj.caravan.contact_phone if obj.caravan else None

    def get_caravan_leader_name(self, obj):
        if obj.caravan and obj.caravan.leader:
            return obj.caravan.leader.full_name or obj.caravan.leader.phone
        return obj.caravan.manager if obj.caravan else None
