from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import Booking
from carvans.models import Caravan
from .serializers import BookingStep1Serializer, BookingStep2Serializer, BookingStep3Serializer, BookingSerializer

class BookingStep1View(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        serializer = BookingStep1Serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        caravan_id = serializer.validated_data['caravan_id']
        try:
            caravan = Caravan.objects.get(id=caravan_id)
        except Caravan.DoesNotExist:
            return Response({"message": "کاروان یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        booking = Booking.objects.create(
            user=request.user,
            caravan=caravan,
            main_passenger_name=serializer.validated_data['main_passenger_name'],
            main_passenger_id=serializer.validated_data['main_passenger_id'],
            main_passenger_phone=serializer.validated_data['main_passenger_phone'],
            main_passenger_birthdate=serializer.validated_data['main_passenger_birthdate'],
            passenger_count=serializer.validated_data['passenger_count'],
            total_price=caravan.price,  # محاسبه قیمت کل مقدماتی
            transportation_type=caravan.transportation_type
        )
        return Response({
            "message": "مرحله اول رزرو با موفقیت ثبت شد.",
            "bookingId": booking.id,
            "step": 1
        }, status=status.HTTP_201_CREATED)

class BookingStep2View(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, id):
        serializer = BookingStep2Serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            booking = Booking.objects.get(id=id, user=request.user)
        except Booking.DoesNotExist:
            return Response({"message": "رزرو یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        booking.companions = serializer.validated_data['companions']
        booking.current_step = 2
        booking.save()
        return Response({
            "message": "مرحله دوم رزرو با موفقیت ثبت شد.",
            "bookingId": booking.id,
            "step": 2
        })

class BookingStep3View(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, id):
        serializer = BookingStep3Serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            booking = Booking.objects.get(id=id, user=request.user)
        except Booking.DoesNotExist:
            return Response({"message": "رزرو یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        booking.address = serializer.validated_data['address']
        booking.special_requests = serializer.validated_data.get('special_requests')
        booking.selected_seats = serializer.validated_data.get('selected_seats', [])
        booking.current_step = 3
        booking.save()
        return Response({"message": "مرحله سوم رزرو ثبت شد.", "step": 3})

class CompleteBookingView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, id):
        booking = Booking.objects.filter(id=id, user=request.user).first()
        if not booking:
            return Response({"message": "رزرو یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        booking.status = 'completed'
        booking.is_completed = True
        # seats info: request.data.get('selected_seats', []) به دلخواه پروژه اضافه شود
        booking.save()
        return Response({"message": "رزرو تکمیل شد."})

class UserBookingsView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        bookings = Booking.objects.filter(user=request.user)
        return Response(BookingSerializer(bookings, many=True).data)

class BookingDetailView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, id):
        booking = Booking.objects.filter(id=id, user=request.user).first()
        if not booking:
            return Response({"message": "رزرو یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        return Response(BookingSerializer(booking).data)
