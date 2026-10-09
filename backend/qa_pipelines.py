"""
تست سرتاسری همه‌ی پایپ‌لاین‌های سامانه رزرو کاروان.

اجرا:  ../ziaratenv/bin/python manage.py shell < qa_pipelines.py
هر پایپ‌لاین از ۲۰ نمره ارزیابی می‌شود؛ هر بررسی ناموفق نمره را کم می‌کند.
"""
import io
import csv
import json
import datetime

from django.test import Client
from django.utils import timezone
from django.contrib.auth import get_user_model

from carvans.models import Caravan
from bookings.models import Booking

User = get_user_model()

RESULTS = []          # [(pipeline, [(check, ok, detail), ...])]
_current = None


def pipeline(name):
    global _current
    _current = (name, [])
    RESULTS.append(_current)


def check(desc, ok, detail=""):
    _current[1].append((desc, bool(ok), str(detail)[:300]))
    print(("  ✅ " if ok else "  ❌ ") + desc + (f"  → {detail}" if not ok and detail else ""))


def auth(client, phone, **kw):
    """ورود کاربر با کد یکبار مصرف و برگرداندن هدر Authorization."""
    user, created = User.objects.get_or_create(phone=phone, defaults=kw)
    for k, v in kw.items():
        setattr(user, k, v)
    user.save()
    from rest_framework_simplejwt.tokens import RefreshToken
    token = RefreshToken.for_user(user)
    return user, {"HTTP_AUTHORIZATION": f"Bearer {token.access_token}"}


def cleanup():
    Booking.objects.filter(main_passenger_name__startswith="تستی").delete()
    Caravan.objects.filter(name__startswith="[QA]").delete()
    User.objects.filter(phone__startswith="0999000").delete()


cleanup()
c = Client()

# ---------------------------------------------------------------- 1. احراز هویت
pipeline("۱) احراز هویت و ورود کاربر")
r = c.post("/api/auth/send-code", {"phone": "09990001111"}, content_type="application/json")
check("ارسال کد تأیید (send-code)", r.status_code in (200, 201), f"{r.status_code} {r.content[:120]}")

zaer, zaer_h = auth(c, "09990001111", full_name="تستی زائر", role="pilgrim")
r = c.get("/api/user", **zaer_h)
check("دریافت پروفایل با توکن (GET /api/user)", r.status_code == 200, r.status_code)
r = c.get("/api/user")
check("دسترسی بدون توکن رد می‌شود", r.status_code in (401, 403), r.status_code)

# ---------------------------------------------------------------- 2. ثبت کاروان
pipeline("۲) ثبت کاروان توسط کاروان‌دار (شامل نوع اتوبوس)")
leader, leader_h = auth(
    c, "09990002222", full_name="تستی کاروان‌دار", role="caravan_leader", is_leader_approved=True
)

start = timezone.now() + datetime.timedelta(days=30)
payload = {
    "name": "[QA] کاروان تست زمینی",
    "destination": "karbala",
    "description": "کاروان تستی",
    "departure_date": "۱۴۰۵/۰۶/۱۵",
    "duration": 5,
    "start_date": start.isoformat(),
    "end_date": (start + datetime.timedelta(days=5)).isoformat(),
    "transportation_type": "bus",
    "bus_type": 32,
    "origin_city": "تهران",
    "transit_cities": ["قم"],
    "accommodation_type": "hotel",
    "accommodation_distance": 300,
    "price": 3500000,
    "capacity": 32,
    "remaining_capacity": 32,
    "contact_phone": "09990002222",
    "itinerary": [],
    "leader_messaging_apps": [],
}
r = c.post("/api/leader/caravans", json.dumps(payload), content_type="application/json", **leader_h)
check("ثبت کاروان زمینی با اتوبوس ۳۲ نفره", r.status_code == 201, f"{r.status_code} {r.content[:200]}")
caravan_id = r.json().get("id") if r.status_code == 201 else None

if caravan_id:
    cv = Caravan.objects.get(id=caravan_id)
    check("نوع اتوبوس ذخیره شد", cv.bus_type == 32, cv.bus_type)
    check("سفر زمینی تشخیص داده شد", cv.is_ground_transport is True)
    check("تعداد اتوبوس درست محاسبه شد", cv.bus_count == 1, cv.bus_count)
    cv.status = "approved"
    cv.save()

    # اتوبوس ۴۴ نفره با ظرفیت ۸۸ = ۲ اتوبوس
    p2 = dict(payload, name="[QA] کاروان دو اتوبوسه", bus_type=44, capacity=88, remaining_capacity=88)
    r2 = c.post("/api/leader/caravans", json.dumps(p2), content_type="application/json", **leader_h)
    ok2 = r2.status_code == 201
    check("ثبت کاروان ۸۸ نفره با اتوبوس ۴۴ نفره", ok2, r2.status_code)
    if ok2:
        cv2 = Caravan.objects.get(id=r2.json()["id"])
        check("۸۸ نفر = ۲ اتوبوس ۴۴ نفره", cv2.bus_count == 2, cv2.bus_count)

    r = c.get(f"/api/caravans/{caravan_id}")
    body = r.json()
    check("API کاروان نوع اتوبوس را برمی‌گرداند", body.get("bus_type") == 32, body.get("bus_type"))
    check("API فیلد is_ground_transport دارد", body.get("is_ground_transport") is True)
    check("عنوان فارسی نوع اتوبوس", "۳۲" in (body.get("bus_type_display") or ""), body.get("bus_type_display"))

# ------------------------------------------------------- 3. ثبت‌نام ساده (مرحله ۱)
pipeline("۳) ثبت‌نام ساده زائر (نام، نام خانوادگی، کد ملی)")
booking_id = None
if caravan_id:
    r = c.post("/api/bookings/step1", json.dumps({
        "caravan_id": caravan_id, "passenger_count": 2,
        "first_name": "تستی", "last_name": "زائری", "main_passenger_id": "0012345678",
        "main_passenger_phone": "09121230001",
    }), content_type="application/json", **zaer_h)
    check("ثبت مرحله ۱ فقط با نام/نام‌خانوادگی/کدملی", r.status_code == 201, f"{r.status_code} {r.content[:200]}")
    if r.status_code == 201:
        booking_id = r.json()["bookingId"]
        b = Booking.objects.get(id=booking_id)
        check("نام و نام خانوادگی جدا ذخیره شد",
              b.main_passenger_first_name == "تستی" and b.main_passenger_last_name == "زائری")
        check("نام کامل ساخته شد", b.main_passenger_name == "تستی زائری", b.main_passenger_name)
        check("شماره موبایل واردشده ذخیره شد", b.main_passenger_phone == "09121230001", b.main_passenger_phone)

    # کد ملی نامعتبر باید رد شود
    for bad in ("123", "abcdefghij", ""):
        rb = c.post("/api/bookings/step1", json.dumps({
            "caravan_id": caravan_id, "passenger_count": 1,
            "first_name": "تستی", "last_name": "خطا", "main_passenger_id": bad,
            "main_passenger_phone": "09121230002",
        }), content_type="application/json", **zaer_h)
        check(f"کد ملی نامعتبر «{bad or 'خالی'}» رد می‌شود", rb.status_code == 400, rb.status_code)

    # شماره موبایل نامعتبر باید رد شود
    for badp in ("0912", "12345678901", "09121a23456", ""):
        rbp = c.post("/api/bookings/step1", json.dumps({
            "caravan_id": caravan_id, "passenger_count": 1,
            "first_name": "تستی", "last_name": "موبایل", "main_passenger_id": "0012345670",
            "main_passenger_phone": badp,
        }), content_type="application/json", **zaer_h)
        check(f"شماره موبایل نامعتبر «{badp or 'خالی'}» رد می‌شود", rbp.status_code == 400, rbp.status_code)

    rmp = c.post("/api/bookings/step1", json.dumps({
        "caravan_id": caravan_id, "passenger_count": 1,
        "first_name": "تستی", "last_name": "بی‌موبایل", "main_passenger_id": "0012345671",
    }), content_type="application/json", **zaer_h)
    check("شماره موبایل الزامی است", rmp.status_code == 400, rmp.status_code)

    # ارقام فارسی باید پذیرفته و نرمال شوند
    rp = c.post("/api/bookings/step1", json.dumps({
        "caravan_id": caravan_id, "passenger_count": 1,
        "first_name": "تستی", "last_name": "فارسی", "main_passenger_id": "۰۰۱۲۳۴۵۶۷۹",
        "main_passenger_phone": "۰۹۱۲۱۲۳۰۰۰۳",
    }), content_type="application/json", **zaer_h)
    ok = rp.status_code == 201
    check("کد ملی با ارقام فارسی پذیرفته می‌شود", ok, rp.status_code)
    if ok:
        _b = Booking.objects.get(id=rp.json()["bookingId"])
        check("ارقام فارسی کد ملی به لاتین تبدیل شد", _b.main_passenger_id == "0012345679")
        check("ارقام فارسی موبایل به لاتین تبدیل شد", _b.main_passenger_phone == "09121230003", _b.main_passenger_phone)

# ---------------------------------------------------------- 4. کد رزرو
pipeline("۴) تولید کد رزرو (کد کاروان + تاریخ + روز)")
if booking_id:
    b = Booking.objects.get(id=booking_id)
    code = b.booking_code
    check("کد رزرو تولید شد", bool(code), code)
    check("کد شامل شناسه کاروان است", code.startswith(f"C{caravan_id}-"), code)
    check("کد شامل تاریخ حرکت است", "14050615" in code, code)
    check("کد شامل مدت سفر است", "-D5-" in code, code)
    others = Booking.objects.filter(caravan_id=caravan_id).values_list("booking_code", flat=True)
    check("کدهای رزرو یکتا هستند", len(set(others)) == len(list(others)), list(others))
    check("کد رزرو در API رزرو هست",
          c.get(f"/api/bookings/{booking_id}", **zaer_h).json().get("booking_code") == code)

# ---------------------------------------------------------- 5. همراهان
pipeline("۵) ثبت همراهان")
if booking_id:
    r = c.post(f"/api/bookings/{booking_id}/companions", json.dumps({
        "first_name": "همراه", "last_name": "تستی", "national_id": "0011122233",
        "phone": "۰۹۱۲۹۹۹۸۸۷۷",
    }), content_type="application/json", **zaer_h)
    check("ثبت همراه با نام/نام‌خانوادگی/کدملی/موبایل", r.status_code == 201, f"{r.status_code} {r.content[:200]}")
    _bc = Booking.objects.get(id=booking_id).companions
    check("موبایل همراه ذخیره و به لاتین تبدیل شد",
          _bc and _bc[0].get("phone") == "09129998877", _bc)

    rbad = c.post(f"/api/bookings/{booking_id}/companions", json.dumps({
        "first_name": "همراه", "last_name": "بدشماره", "national_id": "0011122255", "phone": "0912",
    }), content_type="application/json", **zaer_h)
    check("موبایل نامعتبر همراه رد می‌شود", rbad.status_code == 400, rbad.status_code)

    rd = c.post(f"/api/bookings/{booking_id}/companions", json.dumps({
        "first_name": "تکراری", "last_name": "تستی", "national_id": "0011122233",
    }), content_type="application/json", **zaer_h)
    check("کد ملی تکراری در یک رزرو رد می‌شود", rd.status_code == 400, rd.status_code)

    rx = c.post(f"/api/bookings/{booking_id}/companions", json.dumps({
        "first_name": "اضافه", "last_name": "تستی", "national_id": "0011122244",
    }), content_type="application/json", **zaer_h)
    check("همراه بیشتر از تعداد مسافرین رد می‌شود", rx.status_code == 400, rx.status_code)

    rn = c.post(f"/api/bookings/{booking_id}/companions", json.dumps({
        "first_name": "بد", "last_name": "کدملی", "national_id": "12",
    }), content_type="application/json", **zaer_h)
    check("کد ملی نامعتبر همراه رد می‌شود", rn.status_code == 400, rn.status_code)

    # همراه بدون شماره موبایل باید پذیرفته شود (فرزند/سالمند)
    rnf = c.post("/api/bookings/step1", json.dumps({
        "caravan_id": caravan_id, "passenger_count": 2,
        "first_name": "تستی", "last_name": "بی‌شماره", "main_passenger_id": "0066677788",
        "main_passenger_phone": "09121230009",
    }), content_type="application/json", **zaer_h)
    if rnf.status_code == 201:
        _nb = rnf.json()["bookingId"]
        rok = c.post(f"/api/bookings/{_nb}/companions", json.dumps({
            "first_name": "کودک", "last_name": "تستی", "national_id": "0077788899",
        }), content_type="application/json", **zaer_h)
        check("همراه بدون شماره موبایل پذیرفته می‌شود", rok.status_code == 201, rok.status_code)
        check("موبایل خالی به‌صورت رشته خالی ذخیره می‌شود",
              Booking.objects.get(id=_nb).companions[0].get("phone") == "")

# ---------------------------------------------------------- 6. انتخاب صندلی
pipeline("۶) انتخاب صندلی سفر زمینی (باگ اصلی)")
if booking_id:
    # انتخاب صندلی پیش‌فرض خاموش است تا کسی با پر کردن فرم صندلی‌ها را اشغال نکند.
    # اول همان حالت پیش‌فرض بررسی می‌شود، بعد برای ادامه‌ی تست‌ها باز می‌شود.
    cv = Caravan.objects.get(id=caravan_id)
    check("انتخاب صندلی به‌صورت پیش‌فرض خاموش است", cv.seat_selection_enabled is False, cv.seat_selection_enabled)
    check("با وجود زمینی بودن، انتخاب صندلی فعال نیست", cv.seat_selection_active is False)

    r = c.get(f"/api/bookings/{booking_id}/seats", **zaer_h)
    if r.status_code == 200:
        check("پاسخ seatSelectionEnabled=false می‌دهد", r.json().get("seatSelectionEnabled") is False)

    r = c.post(f"/api/bookings/{booking_id}/complete", json.dumps({"selected_seats": []}),
               content_type="application/json", **zaer_h)
    check("وقتی خاموش است، رزرو بدون صندلی ثبت می‌شود", r.status_code == 200, f"{r.status_code} {r.content[:120]}")

    # برگرداندن رزرو به حالت ناتمام تا بقیه‌ی بررسی‌ها از نو اجرا شوند
    Booking.objects.filter(id=booking_id).update(is_completed=False, status="pending", selected_seats=[])
    Caravan.objects.filter(id=caravan_id).update(remaining_capacity=32, seat_selection_enabled=True)

    cv = Caravan.objects.get(id=caravan_id)
    check("بعد از روشن کردن، انتخاب صندلی فعال می‌شود", cv.seat_selection_active is True)

    r = c.get(f"/api/bookings/{booking_id}/seats", **zaer_h)
    ok = r.status_code == 200
    check("دریافت نقشه صندلی", ok, r.status_code)
    if ok:
        d = r.json()
        check("پاسخ نوع اتوبوس دارد", d.get("busType") == 32, d.get("busType"))
        check("پاسخ isGroundTransport دارد", d.get("isGroundTransport") is True)
        check("پاسخ seatSelectionEnabled=true می‌دهد", d.get("seatSelectionEnabled") is True)
        check("تعداد صندلی = ظرفیت کاروان", len(d.get("seats", [])) == 32, len(d.get("seats", [])))

    # ⚠️ باگ گزارش‌شده: تکمیل رزرو بدون انتخاب صندلی
    r = c.post(f"/api/bookings/{booking_id}/complete", json.dumps({"selected_seats": []}),
               content_type="application/json", **zaer_h)
    check("تکمیل رزرو بدون صندلی رد می‌شود (باگ اصلی)", r.status_code == 400, f"{r.status_code} {r.content[:160]}")

    r = c.post(f"/api/bookings/{booking_id}/complete", json.dumps({"selected_seats": [3]}),
               content_type="application/json", **zaer_h)
    check("تعداد صندلی کمتر از مسافر رد می‌شود", r.status_code == 400, r.status_code)

    r = c.post(f"/api/bookings/{booking_id}/complete", json.dumps({"selected_seats": [3, 3]}),
               content_type="application/json", **zaer_h)
    check("صندلی تکراری رد می‌شود", r.status_code == 400, r.status_code)

    r = c.post(f"/api/bookings/{booking_id}/complete", json.dumps({"selected_seats": [3, 99]}),
               content_type="application/json", **zaer_h)
    check("صندلی خارج از ظرفیت رد می‌شود", r.status_code == 400, r.status_code)

    r = c.post(f"/api/bookings/{booking_id}/step3", json.dumps(
        {"special_requests": "بدون", "selected_seats": [3, 4]}),
        content_type="application/json", **zaer_h)
    check("ذخیره مرحله ۳ با صندلی معتبر", r.status_code == 200, f"{r.status_code} {r.content[:160]}")

    r = c.post(f"/api/bookings/{booking_id}/complete", json.dumps({"selected_seats": [3, 4]}),
               content_type="application/json", **zaer_h)
    check("تکمیل رزرو با صندلی معتبر", r.status_code == 200, f"{r.status_code} {r.content[:160]}")
    if r.status_code == 200:
        cv = Caravan.objects.get(id=caravan_id)
        check("ظرفیت باقیمانده کم شد", cv.remaining_capacity == 30, cv.remaining_capacity)
        r2 = c.post(f"/api/bookings/{booking_id}/complete", json.dumps({"selected_seats": [3, 4]}),
                    content_type="application/json", **zaer_h)
        check("تکمیل دوباره ظرفیت را دوبار کم نمی‌کند",
              Caravan.objects.get(id=caravan_id).remaining_capacity == 30)

    # زائر دوم نباید صندلی اشغال‌شده را بگیرد
    zaer2, zaer2_h = auth(c, "09990003333", full_name="تستی دوم", role="pilgrim")
    r = c.post("/api/bookings/step1", json.dumps({
        "caravan_id": caravan_id, "passenger_count": 1,
        "first_name": "تستی", "last_name": "دومی", "main_passenger_id": "0022233344", "main_passenger_phone": "09121230004",
    }), content_type="application/json", **zaer2_h)
    if r.status_code == 201:
        b2 = r.json()["bookingId"]
        rr = c.post(f"/api/bookings/{b2}/complete", json.dumps({"selected_seats": [3]}),
                    content_type="application/json", **zaer2_h)
        check("صندلی رزروشده توسط زائر دیگر قابل انتخاب نیست", rr.status_code == 400, rr.status_code)
        seats = c.get(f"/api/bookings/{b2}/seats", **zaer2_h).json()["seats"]
        occ = [s["number"] for s in seats if s["isOccupied"]]
        check("صندلی‌های ۳ و ۴ اشغال نمایش داده می‌شوند", occ == [3, 4], occ)

# ---------------------------------------------- 7. سفر هوایی (بدون انتخاب صندلی)
pipeline("۷) سفر هوایی — انتخاب صندلی لازم نیست")
air = dict(payload, name="[QA] کاروان هوایی", transportation_type="airplane", capacity=40, remaining_capacity=40)
r = c.post("/api/leader/caravans", json.dumps(air), content_type="application/json", **leader_h)
if r.status_code == 201:
    air_id = r.json()["id"]
    Caravan.objects.filter(id=air_id).update(status="approved")
    check("سفر هوایی زمینی نیست", Caravan.objects.get(id=air_id).is_ground_transport is False)
    r = c.post("/api/bookings/step1", json.dumps({
        "caravan_id": air_id, "passenger_count": 1,
        "first_name": "تستی", "last_name": "هوایی", "main_passenger_id": "0033344455", "main_passenger_phone": "09121230005",
    }), content_type="application/json", **zaer_h)
    if r.status_code == 201:
        ab = r.json()["bookingId"]
        rr = c.post(f"/api/bookings/{ab}/complete", json.dumps({"selected_seats": []}),
                    content_type="application/json", **zaer_h)
        check("رزرو هوایی بدون صندلی تکمیل می‌شود", rr.status_code == 200, f"{rr.status_code} {rr.content[:160]}")
else:
    check("ثبت کاروان هوایی", False, r.status_code)

# ---------------------------------------------------------- 8. ظرفیت
pipeline("۸) کنترل ظرفیت کاروان")
small = dict(payload, name="[QA] کاروان کم‌ظرفیت", capacity=2, remaining_capacity=1, bus_type=25)
r = c.post("/api/leader/caravans", json.dumps(small), content_type="application/json", **leader_h)
if r.status_code == 201:
    sid = r.json()["id"]
    Caravan.objects.filter(id=sid).update(status="approved", remaining_capacity=1)
    rr = c.post("/api/bookings/step1", json.dumps({
        "caravan_id": sid, "passenger_count": 3,
        "first_name": "تستی", "last_name": "پرظرفیت", "main_passenger_id": "0044455566", "main_passenger_phone": "09121230006",
    }), content_type="application/json", **zaer_h)
    check("رزرو بیشتر از ظرفیت باقیمانده رد می‌شود", rr.status_code == 400, f"{rr.status_code} {rr.content[:160]}")
else:
    check("ثبت کاروان کم‌ظرفیت", False, r.status_code)

# کاروان تأییدنشده
pend = dict(payload, name="[QA] کاروان تأییدنشده")
r = c.post("/api/leader/caravans", json.dumps(pend), content_type="application/json", **leader_h)
if r.status_code == 201:
    rr = c.post("/api/bookings/step1", json.dumps({
        "caravan_id": r.json()["id"], "passenger_count": 1,
        "first_name": "تستی", "last_name": "معلق", "main_passenger_id": "0055566677", "main_passenger_phone": "09121230007",
    }), content_type="application/json", **zaer_h)
    check("رزرو کاروان تأییدنشده رد می‌شود", rr.status_code == 400, rr.status_code)

# ------------------------------------------------- 9. داشبورد کاروان‌دار و CSV
pipeline("۹) داشبورد کاروان‌دار و خروجی CSV وضعیت مسافران")
r = c.get("/api/leader/bookings", **leader_h)
check("لیست رزروهای کاروان‌دار", r.status_code == 200, r.status_code)

r = c.get("/api/leader/bookings/export", **leader_h)
ok = r.status_code == 200
check("دانلود CSV با توکن", ok, r.status_code)
if ok:
    raw = r.content.decode("utf-8")
    check("فایل BOM دارد (اکسل فارسی)", raw.startswith("﻿"), repr(raw[:3]))
    check("نوع محتوا CSV است", "text/csv" in r["Content-Type"], r["Content-Type"])
    check("هدر Content-Disposition درست است", "attachment" in r.get("Content-Disposition", ""))
    rows = list(csv.reader(io.StringIO(raw.lstrip("﻿"))))
    check("سطر عنوان شامل «کد رزرو» است", rows and rows[0][0] == "کد رزرو", rows[0][:3] if rows else None)
    check("سطر عنوان شامل نام و نام خانوادگی جدا", "نام خانوادگی" in rows[0], rows[0])
    check("داده مسافران موجود است", len(rows) > 1, len(rows))
    if len(rows) > 1:
        check("همه سطرها تعداد ستون یکسان دارند",
              all(len(x) == len(rows[0]) for x in rows if x), {len(x) for x in rows if x})
        check("کد ملی به شکل متن حفظ شده (صفر ابتدایی)",
              any(cell.startswith('="') for row in rows[1:] for cell in row),
              rows[1][:8])
        check("ستون شماره موبایل در CSV هست", "شماره موبایل" in rows[0], rows[0])
        check("موبایل همراه در CSV آمده",
              any("09129998877" in cell for row in rows[1:] for cell in row),
              [r_ for r_ in rows[1:] if r_ and r_[3] == "همراه"][:1])
        check("همراهان هم سطر جدا دارند",
              any(r_[3] == "همراه" for r_ in rows[1:] if len(r_) > 3),
              [r_[3] for r_ in rows[1:] if len(r_) > 3][:5])

r = c.get("/api/leader/bookings/export")
check("دانلود CSV بدون توکن رد می‌شود", r.status_code in (401, 403), r.status_code)

# ---------------------------------------------------------- 10. لینک پرداخت
pipeline("۱۰) لینک پرداخت در صفحه نهایی")
if booking_id:
    r = c.patch(f"/api/leader/bookings/{booking_id}",
                json.dumps({"payment_link": "https://pay.example.com/abc123"}),
                content_type="application/json", **leader_h)
    check("کاروان‌دار لینک پرداخت را ثبت می‌کند", r.status_code == 200, f"{r.status_code} {r.content[:160]}")
    d = c.get(f"/api/bookings/{booking_id}", **zaer_h).json()
    check("لینک پرداخت در رسید زائر دیده می‌شود",
          d.get("payment_link") == "https://pay.example.com/abc123", d.get("payment_link"))
    check("رسید شامل کد رزرو است", bool(d.get("booking_code")))
    check("رسید شامل صندلی‌ها است", d.get("selected_seats") == [3, 4], d.get("selected_seats"))
    check("رسید شامل نام کاروان است", bool(d.get("caravan_name")))
    check("رسید شامل تلفن مسئول کاروان است", bool(d.get("caravan_leader_phone")))
    check("رسید شامل موبایل سرپرست است", d.get("main_passenger_phone") == "09121230001", d.get("main_passenger_phone"))

# ---------------------------------------------------------- 11. امنیت/مالکیت
pipeline("۱۱) امنیت و کنترل دسترسی")
if booking_id:
    _, other_h = auth(c, "09990004444", full_name="تستی غریبه", role="pilgrim")
    check("رزرو کاربر دیگر قابل مشاهده نیست",
          c.get(f"/api/bookings/{booking_id}", **other_h).status_code == 404)
    check("افزودن همراه به رزرو دیگری ممکن نیست",
          c.post(f"/api/bookings/{booking_id}/companions",
                 json.dumps({"first_name": "ن", "last_name": "خ", "national_id": "0011122299"}),
                 content_type="application/json", **other_h).status_code in (400, 404))
    check("نقشه صندلی رزرو دیگری قابل دیدن نیست",
          c.get(f"/api/bookings/{booking_id}/seats", **other_h).status_code == 404)
    check("کاروان‌دار غیرمالک به رزرو دسترسی ندارد",
          c.patch(f"/api/leader/bookings/{booking_id}", json.dumps({"status": "cancelled"}),
                  content_type="application/json", **other_h).status_code == 404)
    check("مرحله ۱ بدون احراز هویت رد می‌شود",
          c.post("/api/bookings/step1", json.dumps({
              "caravan_id": caravan_id, "passenger_count": 1, "first_name": "ن",
              "last_name": "خ", "main_passenger_id": "0011199988"}),
              content_type="application/json").status_code in (401, 403))

# ---------------------------------------------------------- 12. فهرست عمومی
pipeline("۱۲) فهرست و جستجوی عمومی کاروان‌ها")
r = c.get("/api/caravans")
ok = r.status_code == 200
check("فهرست عمومی کاروان‌ها", ok, r.status_code)
if ok:
    items = r.json()
    check("فقط کاروان‌های تأییدشده نمایش داده می‌شوند",
          all(i["status"] == "approved" for i in items), {i["status"] for i in items})
    check("هر کاروان نوع اتوبوس دارد", all("bus_type" in i for i in items))
check("فیلتر بر اساس مقصد", c.get("/api/caravans?destination=karbala").status_code == 200)
check("فیلتر بر اساس نوع حمل‌ونقل", c.get("/api/caravans?transport=bus").status_code == 200)
check("آمار سایت", c.get("/api/stats").status_code == 200)
check("کاروان ناموجود ۴۰۴ می‌دهد", c.get("/api/caravans/99999").status_code == 404)

# --------------------------------------------- 13. ارقام فارسی در همه ورودی‌ها
pipeline("۱۳) پذیرش ارقام فارسی/عربی در همه ورودی‌های عددی")
from carvans.serializers import CaravanCreateSerializer
from accounts.serializers import VerifyCodeSerializer, RegisterSendCodeSerializer, LeaderRegisterSerializer

# ورود با شماره و کد فارسی
rs = RegisterSendCodeSerializer(data={"phone": "۰۹۹۹۰۰۰۱۱۱۱"})
check("شماره موبایل فارسی در ارسال کد پذیرفته می‌شود", rs.is_valid(), rs.errors)
if rs.is_valid():
    check("شماره به لاتین تبدیل شد", rs.validated_data["phone"] == "09990001111", rs.validated_data["phone"])

vs = VerifyCodeSerializer(data={"phone": "۰۹۹۹۰۰۰۱۱۱۱", "code": "۱۲۳۴"})
check("کد تأیید فارسی پذیرفته می‌شود", vs.is_valid(), vs.errors)
if vs.is_valid():
    check("کد تأیید به لاتین تبدیل شد", vs.validated_data["code"] == "1234", vs.validated_data["code"])

# ثبت‌نام مدیر کاروان با ارقام عربی
ls = LeaderRegisterSerializer(data={"full_name": "تستی", "national_id": "٠٠١٢٣٤٥٦٧٨",
                                    "birth_certificate_no": "۱۲۳۴۵", "address": "تهران"})
check("کد ملی/شناسنامه عربی در ثبت مدیر کاروان پذیرفته می‌شود", ls.is_valid(), ls.errors)
if ls.is_valid():
    check("کد ملی به لاتین تبدیل شد", ls.validated_data["national_id"] == "0012345678", ls.validated_data["national_id"])

# کاروان با اعداد فارسی
start2 = timezone.now() + datetime.timedelta(days=45)
cs = CaravanCreateSerializer(data={
    "name": "کاروان تست ۱۴۰۵", "destination": "karbala",
    "departure_date": "۱۴۰۵/۰۶/۱۵", "duration": "۵",
    "start_date": start2.isoformat(), "end_date": (start2 + datetime.timedelta(days=5)).isoformat(),
    "transportation_type": "bus", "bus_type": "۳۲", "origin_city": "تهران",
    "accommodation_type": "hotel", "accommodation_distance": "۳۰۰",
    "price": "۳٬۵۰۰٬۰۰۰", "capacity": "۳۲", "remaining_capacity": "۳۲",
    "contact_phone": "۰۹۱۲۱۱۱۰۰۰۰",
})
ok_cs = cs.is_valid()
check("کاروان با اعداد فارسی ثبت می‌شود", ok_cs, cs.errors)
if ok_cs:
    d = cs.validated_data
    check("قیمت با جداکننده هزارگان فارسی درست خوانده شد", d["price"] == 3500000, d["price"])
    check("ظرفیت فارسی درست خوانده شد", d["capacity"] == 32, d["capacity"])
    check("نوع اتوبوس فارسی درست خوانده شد", d["bus_type"] == 32, d["bus_type"])
    check("فاصله تا حرم فارسی درست خوانده شد", d["accommodation_distance"] == 300, d["accommodation_distance"])
    check("مدت سفر فارسی درست خوانده شد", d["duration"] == 5, d["duration"])
    check("نام کاروان دست‌نخورده می‌ماند (متن آزاد)", d["name"] == "کاروان تست ۱۴۰۵", d["name"])
    check("تاریخ شمسی نمایشی دست‌نخورده می‌ماند", d["departure_date"] == "۱۴۰۵/۰۶/۱۵", d["departure_date"])
    check("شماره تماس به لاتین تبدیل شد", d["contact_phone"] == "09121110000", d["contact_phone"])

# ارقام مخلوط فارسی و لاتین
if caravan_id:
    rmix = c.post("/api/bookings/step1", json.dumps({
        "caravan_id": caravan_id, "passenger_count": 1,
        "first_name": "تستی", "last_name": "مخلوط", "main_passenger_id": "00۱۲۳۴۵۶۸۰",
        "main_passenger_phone": "0912۱۲۳۰۰۱۰",
    }), content_type="application/json", **zaer_h)
    ok_mix = rmix.status_code == 201
    check("ورودی مخلوط فارسی+لاتین پذیرفته می‌شود", ok_mix, f"{rmix.status_code} {rmix.content[:120]}")
    if ok_mix:
        _mb = Booking.objects.get(id=rmix.json()["bookingId"])
        check("کد ملی مخلوط درست نرمال شد", _mb.main_passenger_id == "0012345680", _mb.main_passenger_id)
        check("موبایل مخلوط درست نرمال شد", _mb.main_passenger_phone == "09121230010", _mb.main_passenger_phone)

# -------------------------------------------- 14. وضعیت ثبت‌نام (باز / به‌زودی / بسته)
pipeline("۱۴) وضعیت ثبت‌نام کاروان (باز، به‌زودی، بسته)")
_open = Caravan.objects.create(
    name="[QA] ثبت‌نام باز", destination="karbala", status="approved",
    departure_date="1405/09/01", duration=4, transportation_type="bus", bus_type=25,
    accommodation_type="hotel", price=1000000, capacity=10, remaining_capacity=10,
    registration_state="open",
)
_soon = Caravan.objects.create(
    name="[QA] به‌زودی", destination="karbala", status="approved",
    departure_date="1405/09/05", duration=4, transportation_type="bus", bus_type=25,
    accommodation_type="hotel", price=1000000, capacity=10, remaining_capacity=10,
    registration_state="soon", registration_opens_on="۱۴۰۵/۰۸/۱۵",
)
_closed = Caravan.objects.create(
    name="[QA] بسته", destination="karbala", status="approved",
    departure_date="1405/09/09", duration=4, transportation_type="bus", bus_type=25,
    accommodation_type="hotel", price=1000000, capacity=10, remaining_capacity=10,
    registration_state="closed",
)
_full = Caravan.objects.create(
    name="[QA] تکمیل", destination="karbala", status="approved",
    departure_date="1405/09/12", duration=4, transportation_type="bus", bus_type=25,
    accommodation_type="hotel", price=1000000, capacity=10, remaining_capacity=0,
    registration_state="open",
)

check("پیش‌فرض وضعیت ثبت‌نام «باز» است", Caravan._meta.get_field("registration_state").default == "open")
check("کاروان باز قابل رزرو است", _open.is_bookable is True)
check("کاروان به‌زودی قابل رزرو نیست", _soon.is_bookable is False)
check("کاروان بسته قابل رزرو نیست", _closed.is_bookable is False)
check("کاروان پرشده قابل رزرو نیست", _full.is_bookable is False)
check("برچسب باز", _open.availability_label == "دارای ظرفیت", _open.availability_label)
check("برچسب به‌زودی تاریخ را نشان می‌دهد",
      _soon.availability_label == "ثبت‌نام از ۱۴۰۵/۰۸/۱۵", _soon.availability_label)
check("برچسب بسته", _closed.availability_label == "ثبت‌نام بسته است", _closed.availability_label)
check("برچسب تکمیل بر وضعیت ثبت‌نام اولویت دارد", _full.availability_label == "تکمیل شده", _full.availability_label)
check("رنگ برچسب‌ها درست است",
      (_open.availability_tone, _soon.availability_tone, _closed.availability_tone, _full.availability_tone)
      == ("open", "soon", "closed", "full"))

# سرور هم باید جلوی رزرو را بگیرد، نه فقط دکمه‌ی غیرفعال در رابط کاربری
_payload = {"passenger_count": 1, "first_name": "تستی", "last_name": "وضعیت",
            "main_passenger_id": "0099887766", "main_passenger_phone": "09121239999"}
r = c.post("/api/bookings/step1", json.dumps(dict(_payload, caravan_id=_soon.id)),
           content_type="application/json", **zaer_h)
check("سرور رزرو کاروان «به‌زودی» را رد می‌کند", r.status_code == 400, f"{r.status_code} {r.content[:120]}")
check("پیام رد شامل تاریخ بازشدن است", "۱۴۰۵/۰۸/۱۵" in r.content.decode(), r.content[:160])

r = c.post("/api/bookings/step1", json.dumps(dict(_payload, caravan_id=_closed.id)),
           content_type="application/json", **zaer_h)
check("سرور رزرو کاروان «بسته» را رد می‌کند", r.status_code == 400, f"{r.status_code} {r.content[:120]}")

r = c.post("/api/bookings/step1", json.dumps(dict(_payload, caravan_id=_open.id)),
           content_type="application/json", **zaer_h)
check("رزرو کاروان باز پذیرفته می‌شود", r.status_code == 201, f"{r.status_code} {r.content[:120]}")

# در خروجی API هم بیاید تا کارت بتواند برچسب را نشان دهد
r = c.get(f"/api/caravans/{_soon.id}")
if r.status_code == 200:
    d = r.json()
    check("API برچسب و رنگ وضعیت را برمی‌گرداند",
          d.get("availability_label") == "ثبت‌نام از ۱۴۰۵/۰۸/۱۵" and d.get("availability_tone") == "soon",
          (d.get("availability_label"), d.get("availability_tone")))
    check("API is_bookable را برمی‌گرداند", d.get("is_bookable") is False, d.get("is_bookable"))

# ---------------------------------------------------------------- گزارش نهایی
print("\n" + "=" * 78)
print("گزارش تست پایپ‌لاین‌ها".rjust(46))
print("=" * 78)
total = 0
report = []
for name, checks in RESULTS:
    passed = sum(1 for _, ok, _ in checks if ok)
    n = len(checks) or 1
    score = round(20 * passed / n, 1)
    total += score
    report.append({"pipeline": name, "passed": passed, "total": len(checks), "score": score,
                   "failures": [(d, det) for d, ok, det in checks if not ok]})
    bar = "█" * int(score) + "░" * (20 - int(score))
    print(f"{score:5.1f}/20  {bar}  {name}  ({passed}/{len(checks)})")

avg = round(total / len(RESULTS), 1) if RESULTS else 0
print("-" * 78)
print(f"میانگین کل: {avg}/20")
fails = [(r["pipeline"], f) for r in report for f in r["failures"]]
if fails:
    print(f"\n{len(fails)} بررسی ناموفق:")
    for p, (d, det) in fails:
        print(f"  ✗ [{p}] {d}" + (f" → {det}" if det else ""))

with open("/tmp/qa_report.json", "w") as f:
    json.dump({"average": avg, "pipelines": report}, f, ensure_ascii=False, indent=2)
print("\nگزارش JSON: /tmp/qa_report.json")
cleanup()
