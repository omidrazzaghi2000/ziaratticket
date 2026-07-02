from rest_framework import serializers
from .models import Caravan, CaravanPhoto


class CaravanPhotoSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = CaravanPhoto
        fields = ['id', 'photo_url', 'caption', 'category', 'category_display', 'order']

    def get_photo_url(self, obj):
        request = self.context.get('request')
        if obj.photo and request:
            return request.build_absolute_uri(obj.photo.url)
        return None


class CaravanSerializer(serializers.ModelSerializer):
    destination_display = serializers.CharField(source='get_destination_display', read_only=True)
    transportation_display = serializers.CharField(source='get_transportation_type_display', read_only=True)
    accommodation_display = serializers.CharField(source='get_accommodation_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    leader_name = serializers.SerializerMethodField()
    leader_phone = serializers.SerializerMethodField()
    image_full_url = serializers.SerializerMethodField()
    is_international = serializers.BooleanField(read_only=True)
    is_air_travel = serializers.BooleanField(read_only=True)
    photos = CaravanPhotoSerializer(many=True, read_only=True)

    class Meta:
        model = Caravan
        fields = '__all__'

    def get_leader_name(self, obj):
        if obj.leader:
            return obj.leader.full_name or obj.leader.phone
        return obj.manager

    def get_leader_phone(self, obj):
        if obj.leader:
            return obj.contact_phone or obj.leader.phone
        return obj.contact_phone

    def get_image_full_url(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image_url or None


class CaravanCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Caravan
        exclude = ['leader', 'status', 'created_at', 'updated_at']

    def validate_duration(self, value):
        if value not in range(3, 10):
            raise serializers.ValidationError("مدت سفر باید بین ۳ تا ۹ روز باشد.")
        return value

    def validate_passenger_count(self, value):
        if value < 1:
            raise serializers.ValidationError("ظرفیت باید حداقل ۱ نفر باشد.")
        return value
