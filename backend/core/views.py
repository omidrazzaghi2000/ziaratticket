from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import Contact, Newsletter
from .serializers import ContactSerializer, NewsletterSerializer

class ContactView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        serializer = ContactSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "پیام ارسال شد."}, status=201)

class NewsletterView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        serializer = NewsletterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "ایمیل ثبت شد."}, status=201)
