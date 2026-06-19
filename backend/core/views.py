import time
import json
from urllib.request import urlopen
from urllib.parse import urlencode
from urllib.error import URLError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .models import Contact, Newsletter
from .serializers import ContactSerializer, NewsletterSerializer

# کش ساده در حافظه برای اوقات شرعی
_prayer_times_cache = {"data": None, "timestamp": 0}
CACHE_DURATION = 3600  # 1 ساعت


class PrayerTimesView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        now = time.time()
        if _prayer_times_cache["data"] and (now - _prayer_times_cache["timestamp"]) < CACHE_DURATION:
            return Response(_prayer_times_cache["data"])

        try:
            params = urlencode({"city": "Karbala", "country": "Iraq", "method": 2})
            url = f"https://api.aladhan.com/v1/timingsByCity?{params}"
            with urlopen(url, timeout=5) as resp:
                data = json.loads(resp.read().decode())
            timings = data.get("data", {}).get("timings", {})

            result = {
                "fajr": timings.get("Fajr", ""),
                "sunrise": timings.get("Sunrise", ""),
                "dhuhr": timings.get("Dhuhr", ""),
                "asr": timings.get("Asr", ""),
                "maghrib": timings.get("Maghrib", ""),
                "isha": timings.get("Isha", ""),
                "midnight": timings.get("Midnight", ""),
            }

            _prayer_times_cache["data"] = result
            _prayer_times_cache["timestamp"] = now

            return Response(result)

        except (URLError, Exception):
            # در صورت خطا، داده‌های پیش‌فرض برمی‌گردیم
            fallback = {
                "fajr": "04:15",
                "sunrise": "05:45",
                "dhuhr": "12:05",
                "asr": "15:30",
                "maghrib": "18:20",
                "isha": "19:45",
                "midnight": "00:10",
            }
            return Response(fallback)


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
