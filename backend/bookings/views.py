from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from .models import Booking
from .services import (
    BookingError, boarding_city_for, finalize_booking, occupied_seats_for,
    opening_error, registration_error, validate_seats,
)
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

        passenger_count = serializer.validated_data['passenger_count']
        error = opening_error(caravan, passenger_count)
        if error:
            return Response({"message": error}, status=status.HTTP_400_BAD_REQUEST)
        try:
            boarding_city = boarding_city_for(caravan, serializer.validated_data.get('boarding_city'))
        except BookingError as exc:
            return Response({"message": exc.message}, status=status.HTTP_400_BAD_REQUEST)

        total_price = caravan.price * passenger_count
        first_name = serializer.validated_data['first_name'].strip()
        last_name = serializer.validated_data['last_name'].strip()

        booking = Booking.objects.create(
            user=request.user,
            caravan=caravan,
            main_passenger_first_name=first_name,
            main_passenger_last_name=last_name,
            main_passenger_name=f"{first_name} {last_name}".strip(),
            main_passenger_id=serializer.validated_data['main_passenger_id'],
            main_passenger_phone=serializer.validated_data['main_passenger_phone'],
            passenger_count=passenger_count,
            boarding_city=boarding_city,
            total_price=total_price,
            transportation_type=caravan.transportation_type,
            current_step=1,
        )
        return Response({
            "message": "مرحله اول رزرو با موفقیت ثبت شد.",
            "bookingId": booking.id,
            "bookingCode": booking.booking_code,
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

        first_name = serializer.validated_data['first_name'].strip()
        last_name = serializer.validated_data['last_name'].strip()
        companion_data = {
            "firstName": first_name,
            "lastName": last_name,
            "name": f"{first_name} {last_name}".strip(),
            "nationalId": serializer.validated_data['national_id'],
            "phone": serializer.validated_data.get('phone', ''),
        }

        companions = booking.companions or []
        if len(companions) >= max(0, booking.passenger_count - 1):
            return Response(
                {"message": "تعداد همراهان از تعداد مسافرین ثبت‌شده بیشتر است."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if any(c.get('nationalId') == companion_data['nationalId'] for c in companions) \
                or companion_data['nationalId'] == booking.main_passenger_id:
            return Response(
                {"message": "این کد ملی قبلاً در همین رزرو ثبت شده است."},
                status=status.HTTP_400_BAD_REQUEST,
            )
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
        seats = serializer.validated_data.get('selected_seats', [])
        error = validate_seats(booking, seats)
        if error:
            return Response({"message": error}, status=status.HTTP_400_BAD_REQUEST)

        booking.special_requests = serializer.validated_data.get('special_requests', '')
        booking.selected_seats = seats
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
        occupied = occupied_seats_for(caravan, exclude_booking_id=booking.id)
        mine = set(booking.selected_seats or [])

        seats = [
            {
                "number": i,
                "isOccupied": i in occupied,
                "isSelected": i in mine,
                "passengerName": occupied.get(i),
            }
            for i in range(1, capacity + 1)
        ]

        return Response({
            "seats": seats,
            "busType": caravan.bus_type,
            "busCount": caravan.bus_count,
            "capacity": capacity,
            "isGroundTransport": caravan.is_ground_transport,
            "seatSelectionEnabled": caravan.seat_selection_active,
            "passengerCount": booking.passenger_count,
        })


class CaravanSeatsView(APIView):
    """
    صندلی‌های یک کاروان، بدون نیاز به رزرو.

    فرم رزرو حالا یک صفحه است و نقشه‌ی صندلی پیش از ساخته‌شدن رزرو نمایش
    داده می‌شود؛ پس اشغال‌بودن صندلی‌ها باید در سطح کاروان قابل خواندن باشد.
    نام رزروکننده‌ی هر صندلی عمداً برگردانده نمی‌شود — فقط اشغال یا آزاد.
    """
    permission_classes = [AllowAny]

    def get(self, request, id):
        caravan = Caravan.objects.filter(id=id).first()
        if not caravan:
            return Response({"message": "کاروان یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        capacity = caravan.capacity or 50
        occupied = occupied_seats_for(caravan)

        return Response({
            "seats": [
                {"number": i, "isOccupied": i in occupied, "isSelected": False, "passengerName": None}
                for i in range(1, capacity + 1)
            ],
            "busType": caravan.bus_type,
            "busCount": caravan.bus_count,
            "capacity": capacity,
            "isGroundTransport": caravan.is_ground_transport,
            "seatSelectionEnabled": caravan.seat_selection_active,
        })


class CompleteBookingView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        booking = Booking.objects.filter(id=id, user=request.user).first()
        if not booking:
            return Response({"message": "رزرو یافت نشد."}, status=status.HTTP_404_NOT_FOUND)

        if booking.is_completed:
            return Response({
                "message": "این رزرو قبلاً تکمیل شده است.",
                "bookingId": booking.id,
                "bookingCode": booking.booking_code,
            })

        selected_seats = request.data.get('selected_seats', booking.selected_seats or [])
        try:
            finalize_booking(booking, selected_seats)
        except BookingError as exc:
            return Response({"message": exc.message}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "message": "رزرو تکمیل شد.",
            "bookingId": booking.id,
            "bookingCode": booking.booking_code,
        })


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
