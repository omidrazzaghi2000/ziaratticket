from rest_framework import serializers
from .models import Caravan

class CaravanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Caravan
        fields = '__all__'
