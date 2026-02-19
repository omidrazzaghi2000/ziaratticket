from rest_framework import serializers
from .models import Booking

class BookingStep1Serializer(serializers.Serializer):
    caravan_id = serializers.IntegerField()
    main_passenger_name = serializers.CharField(max_length=100)
    main_passenger_id = serializers.CharField(max_length=20)
    main_passenger_phone = serializers.CharField(max_length=20)
    main_passenger_birthdate = serializers.CharField(max_length=15)
    passenger_count = serializers.IntegerField(min_value=1)

class BookingStep2Serializer(serializers.Serializer):
    companions = serializers.ListField(child=serializers.DictField())

class BookingStep3Serializer(serializers.Serializer):
    address = serializers.CharField()
    special_requests = serializers.CharField(allow_blank=True, required=False)
    selected_seats = serializers.ListField(child=serializers.IntegerField(), required=False)

class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = '__all__'
