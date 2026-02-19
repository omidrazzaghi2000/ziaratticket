from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import Caravan
from .serializers import CaravanSerializer

class CaravanListView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        qs = Caravan.objects.all()
        return Response(CaravanSerializer(qs, many=True).data)
    
    def post(self, request):
        serializer = CaravanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=201)

class CaravanDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, id):
        try:
            caravan = Caravan.objects.get(id=id)
        except Caravan.DoesNotExist:
            return Response({"message": "کاروان یافت نشد."}, status=404)
        return Response(CaravanSerializer(caravan).data)
