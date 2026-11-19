"""
دفتر کاروان — یک‌جا، برای صفحه‌ی سایت و ربات بله.

هر دو از همین تابع‌ها می‌خوانند و می‌نویسند تا یک قاعده دو جور اجرا نشود:
ردیف دستی از ظرفیت کم کند و با حذف برگرداند، ردیف رزرو را نتوان حذف کرد (لغو
رزرو جای آن است)، و مبلغ‌ها با ارقام فارسی و جداکننده هم پذیرفته شوند.
"""

from django.db import transaction

from carvans.models import Caravan
from core.digits import normalize_number

from .models import LedgerRow


class LedgerError(Exception):
    """متن فارسی قابل نمایش به مدیر کاروان."""

    def __init__(self, message):
        super().__init__(message)
        self.message = message


ORIGIN_LABELS = dict(LedgerRow.ORIGIN_CHOICES)


def origin_from_city(city):
    """محل سوار شدنِ رزرو (متن آزاد کاروان) → یکی از چهار گزینه‌ی دفتر."""
    city = (city or '').strip()
    if not city:
        return ''
    if 'تهران' in city:
        return 'tehran'
    if 'قم' in city:
        return 'qom'
    if 'مهران' in city:
        return 'mehran'
    return 'transit'


def parse_amount(value, field='مبلغ'):
    """«۲٬۵۰۰٬۰۰۰»، «2,500,000» یا 2500000 → 2500000. منفی و متن قبول نیست."""
    if value in (None, ''):
        return 0
    if isinstance(value, bool):
        raise LedgerError(f'{field} باید عدد باشد.')
    if isinstance(value, int):
        number = value
    else:
        text = str(normalize_number(str(value))).replace('٬', '').replace(' ', '')
        if not text.isdigit():
            raise LedgerError(f'{field} باید عدد (به تومان) باشد.')
        number = int(text)
    if number < 0:
        raise LedgerError(f'{field} نمی‌تواند منفی باشد.')
    if number > 100_000_000_000:
        raise LedgerError(f'{field} بیش از حد بزرگ است.')
    return number


def clean_origin(value):
    value = (value or '').strip()
    if value and value not in ORIGIN_LABELS:
        # برچسب فارسی هم پذیرفته شود («قم» به‌جای qom)
        reverse = {label: key for key, label in ORIGIN_LABELS.items()}
        if value in reverse:
            return reverse[value]
        raise LedgerError('مبدأ باید یکی از تهران، قم، مرز مهران یا بین‌راهی باشد.')
    return value


def rows_for(caravan):
    return list(LedgerRow.objects.filter(caravan=caravan).order_by('is_cancelled', 'created_at', 'id'))


def totals(rows):
    active = [r for r in rows if not r.is_cancelled]
    cost = sum(int(r.cost) for r in active)
    paid = sum(int(r.paid) for r in active)
    return {'count': len(active), 'cost': cost, 'paid': paid, 'remaining': cost - paid}


def add_booking_rows(booking):
    """
    رزرو قطعی‌شده → یک ردیف برای سرپرست و یکی برای هر همراه.

    هزینه‌ی هر نفر قیمت یک نفرِ همان رزرو است. اگر قبلاً ساخته شده باشند (مثلاً
    دوباره صدا زده شود) چیزی تکرار نمی‌شود.
    """
    if LedgerRow.objects.filter(booking=booking).exists():
        return
    count = max(1, booking.passenger_count or 1)
    per_person = int(booking.total_price or 0) // count
    origin = origin_from_city(booking.boarding_city)
    rows = [LedgerRow(
        caravan_id=booking.caravan_id, booking=booking, companion_index=None,
        full_name=booking.main_passenger_name or 'سرپرست', phone=booking.main_passenger_phone or '',
        cost=per_person, origin=origin,
    )]
    for i, c in enumerate(booking.companions or []):
        name = c.get('name') or f"{c.get('firstName', '')} {c.get('lastName', '')}".strip()
        rows.append(LedgerRow(
            caravan_id=booking.caravan_id, booking=booking, companion_index=i,
            full_name=name or f'همراه {i + 1}', phone=c.get('phone') or '',
            cost=per_person, origin=origin,
        ))
    LedgerRow.objects.bulk_create(rows)


def add_manual_row(caravan, *, full_name, phone='', origin='', cost=None, paid=0, notes=''):
    """
    ثبت‌نام تلفنی یا حضوری. یک نفر از ظرفیت باقیمانده‌ی کاروان کم می‌شود تا سایت
    و ربات جایی را که دیگر نیست نفروشند.
    """
    full_name = ' '.join((full_name or '').split())
    if len(full_name) < 2:
        raise LedgerError('نام و نام خانوادگی را بنویسید.')
    phone = str(normalize_number(phone or '')).replace(' ', '')
    if phone and (not phone.isdigit() or len(phone) > 15):
        raise LedgerError('شماره تماس فقط عدد است.')
    origin = clean_origin(origin)
    cost = caravan.price if cost in (None, '') else parse_amount(cost, 'هزینه کاروان')
    paid = parse_amount(paid, 'مبلغ پرداخت‌شده')

    with transaction.atomic():
        locked = Caravan.objects.select_for_update().get(pk=caravan.pk)
        if (locked.remaining_capacity or 0) <= 0:
            raise LedgerError('ظرفیت کاروان تکمیل است. اول ظرفیت را در ویرایش کاروان بیشتر کنید.')
        locked.remaining_capacity -= 1
        locked.save(update_fields=['remaining_capacity'])
        row = LedgerRow.objects.create(
            caravan=locked, full_name=full_name[:120], phone=phone, origin=origin,
            cost=cost, paid=paid, notes=(notes or '').strip(),
        )
    caravan.remaining_capacity = locked.remaining_capacity
    return row


def update_row(row, data):
    """ویرایش یک ردیف؛ فقط فیلدهایی که آمده‌اند عوض می‌شوند."""
    if 'full_name' in data:
        name = ' '.join(str(data['full_name'] or '').split())
        if len(name) < 2:
            raise LedgerError('نام و نام خانوادگی را بنویسید.')
        row.full_name = name[:120]
    if 'phone' in data:
        phone = str(normalize_number(data['phone'] or '')).replace(' ', '')
        if phone and (not phone.isdigit() or len(phone) > 15):
            raise LedgerError('شماره تماس فقط عدد است.')
        row.phone = phone
    if 'cost' in data:
        row.cost = parse_amount(data['cost'], 'هزینه کاروان')
    if 'paid' in data:
        row.paid = parse_amount(data['paid'], 'مبلغ پرداخت‌شده')
    if 'origin' in data:
        row.origin = clean_origin(data['origin'])
    if 'notes' in data:
        row.notes = str(data['notes'] or '').strip()
    row.save()
    return row


def record_payment(row, amount):
    """یک قسط تازه به پرداختی اضافه می‌کند (برای ربات، که عدد تازه را می‌فرستند)."""
    amount = parse_amount(amount, 'مبلغ')
    if amount <= 0:
        raise LedgerError('مبلغ باید بیشتر از صفر باشد.')
    with transaction.atomic():
        locked = LedgerRow.objects.select_for_update().get(pk=row.pk)
        locked.paid = int(locked.paid) + amount
        locked.save(update_fields=['paid', 'updated_at'])
    row.paid = locked.paid
    return row


def delete_manual_row(row):
    """فقط ردیف دستی؛ یک نفر به ظرفیت برمی‌گردد. ردیف رزرو با لغو همان رزرو می‌رود."""
    if not row.is_manual:
        raise LedgerError('این نفر از رزرو آمده است؛ برای حذف، خود رزرو را لغو کنید.')
    with transaction.atomic():
        caravan = Caravan.objects.select_for_update().get(pk=row.caravan_id)
        if not row.is_cancelled:
            caravan.remaining_capacity = min(caravan.capacity or 0, (caravan.remaining_capacity or 0) + 1)
            caravan.save(update_fields=['remaining_capacity'])
        row.delete()
