"""
قواعد رزرو — یک‌جا، برای سایت و ربات بله.

تا پیش از این، قواعد داخل viewهای سایت بود. حالا که زائر از داخل بله هم رزرو
می‌کند، دو نسخه از یک قاعده یعنی روزی که یکی عوض شود و دیگری نه: مثلاً ظرفیتی
که سایت نمی‌فروشد ولی ربات می‌فروشد. پس هر دو از همین‌جا می‌خوانند.
"""

from django.db import transaction

from carvans.models import Caravan

from .models import Booking
from .notifications import notify_leader_of_booking
from .serializers import validate_national_id, validate_mobile, normalize_digits


class BookingError(Exception):
    """رزرو انجام نشد؛ ``message`` متن فارسی قابل نمایش به زائر است."""

    def __init__(self, message, code='invalid'):
        super().__init__(message)
        self.message = message
        # 'seats' یعنی فقط انتخاب صندلی باید تکرار شود، نه کل فرم
        self.code = code


def occupied_seats_for(caravan, exclude_booking_id=None):
    """صندلی‌های اشغال‌شده توسط سایر رزروهای فعال همین کاروان."""
    qs = Booking.objects.filter(
        caravan=caravan,
        status__in=['pending', 'confirmed', 'completed'],
    )
    if exclude_booking_id:
        qs = qs.exclude(id=exclude_booking_id)
    occupied = {}
    for b in qs:
        for seat_num in (b.selected_seats or []):
            occupied[seat_num] = b.main_passenger_name
    return occupied


def registration_error(caravan):
    """پیام فارسی اگر ثبت‌نام این کاروان همین الان باز نیست، وگرنه None."""
    if caravan.has_departed():
        return "تاریخ حرکت این کاروان گذشته است."
    state = caravan.registration_status()
    if state == 'soon':
        when = ''
        if caravan.registration_opens_on:
            when = f' از {caravan.registration_opens_on}'
            if caravan.registration_opens_time:
                when += f' ساعت {caravan.registration_opens_time:%H:%M}'
        return f"ثبت‌نام این کاروان هنوز باز نشده است{when}."
    if state == 'closed':
        return "ثبت‌نام این کاروان بسته شده است."
    return None


def seats_error(caravan, passenger_count, seats, exclude_booking_id=None):
    """اعتبارسنجی صندلی‌های انتخابی: پیام فارسی در صورت خطا، وگرنه None."""
    # وقتی کاروان انتخاب صندلی را روشن نکرده، رزرو بدون صندلی ثبت می‌شود
    if not caravan.seat_selection_active:
        return None

    seats = [int(s) for s in (seats or [])]
    if len(seats) != passenger_count:
        return (
            f"باید دقیقاً {passenger_count} صندلی انتخاب کنید "
            f"({len(seats)} صندلی انتخاب شده است)."
        )
    if len(set(seats)) != len(seats):
        return "هر صندلی فقط یک بار قابل انتخاب است."

    capacity = caravan.capacity or 0
    invalid = [s for s in seats if s < 1 or s > capacity]
    if invalid:
        return "شماره صندلی انتخاب‌شده خارج از ظرفیت کاروان است."

    occupied = occupied_seats_for(caravan, exclude_booking_id=exclude_booking_id)
    taken = [s for s in seats if s in occupied]
    if taken:
        nums = '، '.join(str(s) for s in taken)
        return f"صندلی‌های {nums} توسط زائر دیگری رزرو شده است. لطفاً صندلی دیگری انتخاب کنید."
    return None


def validate_seats(booking, seats):
    """همان ``seats_error`` برای رزروی که از قبل ساخته شده است."""
    return seats_error(booking.caravan, booking.passenger_count, seats, exclude_booking_id=booking.id)


def boarding_city_for(caravan, chosen):
    """
    محل سوار شدن معتبر برای این کاروان.

    اگر کاروان فقط یک مبدأ دارد همان است و از زائر پرسیده نمی‌شود؛ شهری که در
    مسیر کاروان نباشد ``BookingError`` می‌دهد.
    """
    options = caravan.boarding_options
    city = (chosen or '').strip()
    if len(options) == 1 and not city:
        return options[0]
    if city and options and city not in options:
        raise BookingError("محل سوار شدن باید یکی از این شهرها باشد: " + '، '.join(options))
    return city


def opening_error(caravan, passenger_count):
    """آیا همین الان می‌شود برای این تعداد نفر در این کاروان رزرو شروع کرد؟"""
    if caravan.status != 'approved':
        return "این کاروان هنوز تأیید نشده است."
    error = registration_error(caravan)
    if error:
        return error
    if caravan.remaining_capacity < passenger_count:
        return f"ظرفیت باقیمانده کاروان ({caravan.remaining_capacity} نفر) کافی نیست."
    return None


def finalize_booking(booking, selected_seats):
    """
    رزرو را قطعی می‌کند: صندلی‌ها ثبت و ظرفیت کاروان کم می‌شود.

    ردیف کاروان قفل می‌شود تا دو زائر هم‌زمان آخرین ظرفیت را نگیرند. مهلت
    ثبت‌نام و ظرفیت دوباره سنجیده می‌شوند، چون ممکن است بین شروع و پایان فرم
    عوض شده باشند. خطا ``BookingError`` است و چیزی ذخیره نمی‌شود.
    """
    with transaction.atomic():
        caravan = Caravan.objects.select_for_update().get(pk=booking.caravan_id)

        expected_companions = max(0, booking.passenger_count - 1)
        if len(booking.companions or []) != expected_companions:
            raise BookingError(f"اطلاعات {expected_companions} همراه باید ثبت شود.")

        error = seats_error(caravan, booking.passenger_count, selected_seats, exclude_booking_id=booking.id)
        if error:
            raise BookingError(error, code='seats')

        error = registration_error(caravan)
        if error:
            raise BookingError(error)
        if caravan.remaining_capacity < booking.passenger_count:
            raise BookingError("ظرفیت کاروان تکمیل شده است.")

        booking.selected_seats = [int(s) for s in (selected_seats or [])]
        booking.status = 'completed'
        booking.is_completed = True
        booking.current_step = 4
        booking.save()

        caravan.remaining_capacity -= booking.passenger_count
        caravan.save(update_fields=['remaining_capacity'])

        # هر مسافر یک ردیف در دفتر کاروان؛ مدیر فقط پرداختی و توضیح را پر می‌کند
        from .ledger import add_booking_rows
        add_booking_rows(booking)

        # اطلاع به مدیر کاروان در بله، فقط بعد از commit شدن رزرو؛ اگر تراکنش
        # برگردد نباید خبر رزروی داده شود که ثبت نشده است.
        transaction.on_commit(lambda: notify_leader_of_booking(booking))
    return booking


def clean_companion(first_name, last_name, national_id, phone=''):
    """یک همراه را اعتبارسنجی می‌کند و به شکلی که روی رزرو ذخیره می‌شود برمی‌گرداند."""
    from rest_framework import serializers

    first_name, last_name = (first_name or '').strip(), (last_name or '').strip()
    if len(first_name) < 2 or len(last_name) < 2:
        raise BookingError("نام و نام خانوادگی همراه الزامی است.")
    try:
        national_id = validate_national_id(national_id)
        phone = validate_mobile(phone) if normalize_digits(phone) else ''
    except serializers.ValidationError as exc:
        raise BookingError(str(exc.detail[0]))
    return {
        "firstName": first_name,
        "lastName": last_name,
        "name": f"{first_name} {last_name}".strip(),
        "nationalId": national_id,
        "phone": phone,
    }


def place_booking(user, caravan, *, first_name, last_name, national_id, phone,
                  passenger_count, boarding_city='', companions=(), selected_seats=(),
                  special_requests='', source='site'):
    """
    کل رزرو در یک حرکت — همان چهار مرحله‌ی سایت، پشت سر هم و در یک تراکنش.

    ربات بله همه‌ی اطلاعات را در گفتگو جمع می‌کند و آخر کار یک‌جا می‌فرستد؛
    پس یا رزرو کامل ثبت می‌شود یا هیچ ردی از آن نمی‌ماند.
    """
    from rest_framework import serializers

    first_name, last_name = (first_name or '').strip(), (last_name or '').strip()
    if len(first_name) < 2 or len(last_name) < 2:
        raise BookingError("نام و نام خانوادگی سرپرست الزامی است.")
    try:
        national_id = validate_national_id(national_id)
        phone = validate_mobile(phone)
    except serializers.ValidationError as exc:
        raise BookingError(str(exc.detail[0]))
    if not 1 <= int(passenger_count) <= 10:
        raise BookingError("تعداد مسافر باید بین ۱ تا ۱۰ نفر باشد.")
    passenger_count = int(passenger_count)

    cleaned = []
    seen_ids = {national_id}
    for c in companions:
        item = clean_companion(c.get('firstName'), c.get('lastName'), c.get('nationalId'), c.get('phone', ''))
        if item['nationalId'] in seen_ids:
            raise BookingError("این کد ملی قبلاً در همین رزرو ثبت شده است.")
        seen_ids.add(item['nationalId'])
        cleaned.append(item)

    with transaction.atomic():
        error = opening_error(caravan, passenger_count)
        if error:
            raise BookingError(error)
        booking = Booking.objects.create(
            user=user,
            caravan=caravan,
            main_passenger_first_name=first_name,
            main_passenger_last_name=last_name,
            main_passenger_name=f"{first_name} {last_name}".strip(),
            main_passenger_id=national_id,
            main_passenger_phone=phone,
            passenger_count=passenger_count,
            boarding_city=boarding_city_for(caravan, boarding_city),
            companions=cleaned,
            special_requests=(special_requests or '').strip(),
            total_price=caravan.price * passenger_count,
            transportation_type=caravan.transportation_type,
            source=source,
            current_step=3,
        )
        finalize_booking(booking, list(selected_seats or []))
    return booking
