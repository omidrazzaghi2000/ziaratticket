from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import Booking
from carvans.models import Caravan
from .serializers import (
    BookingStep1Serializer, BookingStep2Serializer,
    BookingStep3Serializer, BookingSerializer, CompanionSerializer
)


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

        if caravan.status != 'approved':
            return Response({"message": "این کاروان هنوز تأیید نشده است."}, status=status.HTTP_400_BAD_REQUEST)

        passenger_count = serializer.validated_data['passenger_count']
        total_price = caravan.price * passenger_count

        booking = Booking.objects.create(
            user=request.user,
            caravan=caravan,
            main_passenger_name=serializer.validated_data['main_passenger_name'],
            main_passenger_id=serializer.validated_data.get('main_passenger_id', ''),
            main_passenger_phone=serializer.validated_data['main_passenger_phone'],
            main_passenger_birthdate=serializer.validated_data['main_passenger_birthdate'],
            main_passenger_emergency_phone=serializer.validated_data.get('main_passenger_emergency_phone', ''),
            main_passenger_messaging_apps=serializer.validated_data.get('main_passenger_messaging_apps', []),
            main_passenger_passport_no=serializer.validated_data.get('main_passenger_passport_no', ''),
            main_passenger_foreign_name=serializer.validated_data.get('main_passenger_foreign_name', ''),
            main_passenger_foreign_lastname=serializer.validated_data.get('main_passenger_foreign_lastname', ''),
            passenger_count=passenger_count,
            total_price=total_price,
            transportation_type=caravan.transportation_type,
            current_step=1,
        )
        return Response({
            "message": "مرحله اول رزرو با موفقیت ثبت شد.",
            "bookingId": booking.id,
            "step": 1
        }, status=status.HTTP_201_CREATED)


class AddCompanionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        serializer = CompanionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            booking = Booking.objects.get(id=id, user=request.user)
        except Booking.DoesNotExist:
            return Response({"message": "رزرو یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        companion_data = {
            "name": serializer.validated_data['name'],
            "nationalId": serializer.validated_data.get('national_id', ''),
            "passportNo": serializer.validated_data.get('passport_no', ''),
            "foreignName": serializer.validated_data.get('foreign_name', ''),
            "foreignLastname": serializer.validated_data.get('foreign_lastname', ''),
            "relationship": serializer.validated_data['relationship'],
            "birthdate": serializer.validated_data['birthdate'],
            "phone": serializer.validated_data.get('phone', ''),
        }

        companions = booking.companions or []
        companions.append(companion_data)
        booking.companions = companions
        booking.current_step = 2
        booking.save()

        return Response({
            "message": "اطلاعات همراه ثبت شد.",
            "companionIndex": len(companions) - 1,
            "totalCompanions": len(companions),
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
        return Response({"message": "مرحله دوم رزرو با موفقیت ثبت شد.", "bookingId": booking.id, "step": 2})


class BookingStep3View(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        serializer = BookingStep3Serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            booking = Booking.objects.get(id=id, user=request.user)
        except Booking.DoesNotExist:
            return Response({"message": "رزرو یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        booking.special_requests = serializer.validated_data.get('special_requests', '')
        booking.selected_seats = serializer.validated_data.get('selected_seats', [])
        booking.current_step = 3
        booking.save()
        return Response({"message": "مرحله سوم رزرو ثبت شد.", "step": 3})


class BookingSeatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        try:
            booking = Booking.objects.get(id=id, user=request.user)
        except Booking.DoesNotExist:
            return Response({"message": "رزرو یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        caravan = booking.caravan
        capacity = caravan.capacity or 50

        other_bookings = Booking.objects.filter(
            caravan=caravan,
            status__in=['pending', 'confirmed', 'completed']
        ).exclude(id=booking.id)

        occupied = {}
        for b in other_bookings:
            for seat_num in (b.selected_seats or []):
                occupied[seat_num] = b.main_passenger_name

        seats = []
        for i in range(1, capacity + 1):
            if i in occupied:
                seats.append({"number": i, "isOccupied": True, "isSelected": i in (booking.selected_seats or []), "passengerName": occupied[i]})
            else:
                seats.append({"number": i, "isOccupied": False, "isSelected": i in (booking.selected_seats or []), "passengerName": None})

        return Response(seats)


class CompleteBookingView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        booking = Booking.objects.filter(id=id, user=request.user).first()
        if not booking:
            return Response({"message": "رزرو یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        selected_seats = request.data.get('selected_seats', booking.selected_seats or [])
        booking.selected_seats = selected_seats
        booking.status = 'completed'
        booking.is_completed = True
        booking.save()

        caravan = booking.caravan
        if caravan.remaining_capacity >= booking.passenger_count:
            caravan.remaining_capacity -= booking.passenger_count
            caravan.save()

        return Response({"message": "رزرو تکمیل شد.", "bookingId": booking.id})


class UserBookingsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bookings = Booking.objects.filter(user=request.user).order_by('-created_at')
        return Response(BookingSerializer(bookings, many=True).data)


class BookingDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        booking = Booking.objects.filter(id=id, user=request.user).first()
        if not booking:
            return Response({"message": "رزرو یافت نشد."}, status=status.HTTP_404_NOT_FOUND)
        return Response(BookingSerializer(booking).data)
