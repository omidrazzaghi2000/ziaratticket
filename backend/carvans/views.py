from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import Caravan, CaravanPhoto, CaravanReview
from .serializers import CaravanSerializer, CaravanCreateSerializer, CaravanPhotoSerializer, CaravanReviewSerializer
from bookings.models import Booking
from bookings.serializers import BookingSerializer
import csv
import io
from django.http import HttpResponse
from django.utils import timezone


class CaravanListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = Caravan.objects.filter(status='approved')
        destination = request.query_params.get('destination')
        transport = request.query_params.get('transport')
        min_price = request.query_params.get('min_price')
        max_price = request.query_params.get('max_price')
        duration = request.query_params.get('duration')
        city = request.query_params.get('city')

        if destination:
            qs = qs.filter(destination=destination)
        if transport:
            qs = qs.filter(transportation_type=transport)
        if min_price:
            qs = qs.filter(price__gte=int(min_price))
        if max_price:
            qs = qs.filter(price__lte=int(max_price))
        if duration:
            qs = qs.filter(duration=int(duration))
        if city:
            qs = qs.filter(origin_city__icontains=city)

        return Response(CaravanSerializer(qs, many=True, context={'request': request}).data)

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
        return Response(CaravanSerializer(caravan, context={'request': request}).data)


class LeaderCaravanListView(APIView):
    """Caravan leader: list own caravans or create a new one"""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        qs = Caravan.objects.filter(leader=request.user)
        return Response(CaravanSerializer(qs, many=True, context={'request': request}).data)

    def post(self, request):
        if request.user.role != 'caravan_leader':
            return Response({"message": "فقط مدیران کاروان می‌توانند کاروان ثبت کنند."}, status=403)

        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)

        # Handle JSON fields sent as strings (multipart)
        for field in ('transit_cities', 'itinerary', 'leader_messaging_apps'):
            if field in data and isinstance(data[field], str):
                import json
                try:
                    data[field] = json.loads(data[field])
                except Exception:
                    data[field] = []

        serializer = CaravanCreateSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        caravan = serializer.save(
            leader=request.user,
            manager=request.user.full_name or request.user.phone,
            status='pending',
            remaining_capacity=serializer.validated_data.get('capacity', 0),
        )
        return Response(CaravanSerializer(caravan, context={'request': request}).data, status=201)


class LeaderCaravanDetailView(APIView):
    """Caravan leader: view/edit own caravan"""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get_caravan(self, request, pk):
        try:
            return Caravan.objects.get(pk=pk, leader=request.user)
        except Caravan.DoesNotExist:
            return None

    def get(self, request, pk):
        caravan = self._get_caravan(request, pk)
        if not caravan:
            return Response({"message": "کاروان یافت نشد."}, status=404)
        return Response(CaravanSerializer(caravan, context={'request': request}).data)

    def put(self, request, pk):
        caravan = self._get_caravan(request, pk)
        if not caravan:
            return Response({"message": "کاروان یافت نشد."}, status=404)
        serializer = CaravanCreateSerializer(caravan, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save(status='pending')
        return Response(CaravanSerializer(caravan, context={'request': request}).data)


class LeaderCaravanPhotosView(APIView):
    """Caravan leader: upload photos for their caravan"""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request, pk):
        try:
            caravan = Caravan.objects.get(pk=pk, leader=request.user)
        except Caravan.DoesNotExist:
            return Response({"message": "کاروان یافت نشد."}, status=404)
        photos = caravan.photos.all()
        return Response(CaravanPhotoSerializer(photos, many=True, context={'request': request}).data)

    def post(self, request, pk):
        try:
            caravan = Caravan.objects.get(pk=pk, leader=request.user)
        except Caravan.DoesNotExist:
            return Response({"message": "کاروان یافت نشد."}, status=404)
        files = request.FILES.getlist('photos')
        if not files:
            return Response({"message": "هیچ تصویری ارسال نشده."}, status=400)
        caption = request.data.get('caption', '')
        category = request.data.get('category', 'general')
        created = []
        for f in files:
            photo = CaravanPhoto.objects.create(caravan=caravan, photo=f, caption=caption, category=category)
            created.append(photo)
        return Response(
            CaravanPhotoSerializer(created, many=True, context={'request': request}).data,
            status=201
        )

    def delete(self, request, pk):
        photo_id = request.data.get('photo_id')
        try:
            photo = CaravanPhoto.objects.get(pk=photo_id, caravan__leader=request.user, caravan_id=pk)
            photo.photo.delete(save=False)
            photo.delete()
            return Response({"message": "تصویر حذف شد."})
        except CaravanPhoto.DoesNotExist:
            return Response({"message": "تصویر یافت نشد."}, status=404)


class LeaderBookingsView(APIView):
    """Caravan leader: see all bookings for own caravans"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        caravans = Caravan.objects.filter(leader=request.user)
        bookings = Booking.objects.filter(caravan__in=caravans).select_related('caravan', 'user').order_by('-created_at')
        caravan_id = request.query_params.get('caravan_id')
        if caravan_id:
            bookings = bookings.filter(caravan_id=caravan_id)
        return Response(BookingSerializer(bookings, many=True).data)


class LeaderBookingDetailView(APIView):
    """Caravan leader: edit or cancel a booking in their caravan"""
    permission_classes = [permissions.IsAuthenticated]

    def _get_booking(self, request, pk):
        try:
            booking = Booking.objects.get(pk=pk)
            if booking.caravan.leader != request.user:
                return None
            return booking
        except Booking.DoesNotExist:
            return None

    def get(self, request, pk):
        booking = self._get_booking(request, pk)
        if not booking:
            return Response({"message": "رزرو یافت نشد."}, status=404)
        return Response(BookingSerializer(booking).data)

    def patch(self, request, pk):
        booking = self._get_booking(request, pk)
        if not booking:
            return Response({"message": "رزرو یافت نشد."}, status=404)
        allowed = {'status', 'special_requests', 'selected_seats', 'is_paid', 'payment_reference'}
        for key, val in request.data.items():
            if key in allowed:
                setattr(booking, key, val)
        booking.save()
        return Response(BookingSerializer(booking).data)

    def delete(self, request, pk):
        booking = self._get_booking(request, pk)
        if not booking:
            return Response({"message": "رزرو یافت نشد."}, status=404)
        booking.status = 'cancelled'
        booking.save()
        # Restore capacity
        caravan = booking.caravan
        caravan.remaining_capacity += booking.passenger_count
        caravan.save()
        return Response({"message": "رزرو لغو شد."})


class LeaderBookingsExportView(APIView):
    """Caravan leader: export bookings as CSV"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        caravans = Caravan.objects.filter(leader=request.user)
        caravan_id = request.query_params.get('caravan_id')
        bookings = Booking.objects.filter(caravan__in=caravans).select_related('caravan')
        if caravan_id:
            bookings = bookings.filter(caravan_id=caravan_id)

        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = 'attachment; filename="bookings.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'شناسه', 'نام کاروان', 'نام سرپرست', 'کد ملی', 'موبایل', 'شماره اضطراری',
            'تعداد مسافر', 'مبلغ کل', 'وضعیت', 'صندلی‌ها', 'تاریخ ثبت'
        ])
        for b in bookings:
            writer.writerow([
                b.id,
                b.caravan.name,
                b.main_passenger_name,
                b.main_passenger_id,
                b.main_passenger_phone,
                b.main_passenger_emergency_phone,
                b.passenger_count,
                f"{b.total_price:,}",
                b.get_status_display(),
                ', '.join(str(s) for s in (b.selected_seats or [])),
                b.created_at.strftime('%Y-%m-%d %H:%M'),
            ])
        return response


class CaravanStatsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        count = Caravan.objects.filter(status='approved').count()
        return Response({'active_caravans': count})


class CaravanReviewsView(APIView):
    """List submitted reviews for a caravan (public)"""
    permission_classes = [permissions.AllowAny]

    def get(self, request, id):
        reviews = CaravanReview.objects.filter(caravan_id=id, is_submitted=True).order_by('-submitted_at')
        return Response(CaravanReviewSerializer(reviews, many=True).data)


class ReviewByTokenView(APIView):
    """Submit a review via one-time token link (public)"""
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        try:
            review = CaravanReview.objects.select_related('caravan').get(token=token)
        except CaravanReview.DoesNotExist:
            return Response({"message": "لینک نظرسنجی معتبر نیست."}, status=404)
        return Response({
            "caravan_name": review.caravan.name,
            "reviewer_name": review.reviewer_name,
            "is_submitted": review.is_submitted,
        })

    def post(self, request, token):
        try:
            review = CaravanReview.objects.get(token=token)
        except CaravanReview.DoesNotExist:
            return Response({"message": "لینک نظرسنجی معتبر نیست."}, status=404)
        if review.is_submitted:
            return Response({"message": "این نظرسنجی قبلاً ثبت شده است."}, status=400)
        rating = request.data.get('rating')
        comment = request.data.get('comment', '')
        if rating is None or not (0 <= int(rating) <= 5):
            return Response({"message": "امتیاز باید بین ۰ تا ۵ باشد."}, status=400)
        review.rating = int(rating)
        review.comment = comment
        review.is_submitted = True
        review.submitted_at = timezone.now()
        review.save()
        return Response({"message": "نظر شما با موفقیت ثبت شد."})


class LeaderGenerateReviewLinkView(APIView):
    """Leader: generate or get review token for a booking"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            booking = Booking.objects.get(pk=pk, caravan__leader=request.user)
        except Booking.DoesNotExist:
            return Response({"message": "رزرو یافت نشد."}, status=404)
        review, created = CaravanReview.objects.get_or_create(
            booking=booking,
            defaults={
                'caravan': booking.caravan,
                'reviewer_name': booking.main_passenger_name,
            }
        )
        token = str(review.token)
        return Response({"token": token, "link": f"/review/{token}"})
