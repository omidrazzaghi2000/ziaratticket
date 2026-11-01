"""
اطلاع‌رسانی رزرو به مدیر کاروان در پیام‌رسان بله.

با تکمیل هر رزرو، خلاصه‌ای از آن (کد رزرو، سرپرست، همراهان، صندلی‌ها و مبلغ)
به چت بله‌ی مدیر کاروان فرستاده می‌شود. پیام فقط یک خبر است؛ جزئیات کامل
همان‌جور که بود در پنل مدیریت می‌ماند.
"""

import logging

from django.db import connection
from django.utils import timezone

from core import bale
from core.jalali import format_jalali_datetime

logger = logging.getLogger(__name__)


def _money(value):
    """مبلغ با جداکننده‌ی هزارگان."""
    try:
        return f"{int(value):,}"
    except (TypeError, ValueError):
        return str(value or '—')


def build_booking_summary(booking) -> str:
    """متن خلاصه‌ی رزرو برای ارسال در بله."""
    caravan = booking.caravan
    lines = [
        '🕋 رزرو جدید ثبت شد',
        '',
        f'کاروان: {caravan.name}',
        f'مقصد: {caravan.get_destination_display()}',
        f'تاریخ حرکت: {caravan.departure_date or "—"} ({caravan.duration or 0} روزه)',
        f'کد رزرو: {booking.booking_code or booking.id}',
        '',
        f'سرپرست: {booking.main_passenger_name}',
        f'موبایل: {booking.main_passenger_phone or "—"}',
        f'کد ملی: {booking.main_passenger_id or "—"}',
        f'تعداد مسافر: {booking.passenger_count} نفر',
    ]
    if booking.boarding_city:
        lines.append(f'محل سوار شدن: {booking.boarding_city}')


    companions = booking.companions or []
    if companions:
        names = '، '.join(
            (c.get('name') or f"{c.get('firstName', '')} {c.get('lastName', '')}").strip()
            for c in companions
        )
        lines.append(f'همراهان: {names}')

    seats = booking.selected_seats or []
    if seats:
        lines.append('صندلی‌ها: ' + '، '.join(str(s) for s in seats))

    if booking.special_requests:
        lines.append(f'درخواست خاص: {booking.special_requests}')

    lines += [
        '',
        f'مبلغ کل: {_money(booking.total_price)} تومان',
        f'وضعیت پرداخت: {"پرداخت شده" if booking.is_paid else "پرداخت نشده"}',
        f'ظرفیت باقیمانده کاروان: {caravan.remaining_capacity} نفر',
        f'زمان ثبت: {format_jalali_datetime(booking.created_at)}',
    ]
    return '\n'.join(lines)


def _record(booking_id, ok, error=''):
    """نتیجه را روی رزرو می‌نویسد؛ update تا با ذخیره‌های هم‌زمان رزرو تداخل نکند."""
    from .models import Booking

    Booking.objects.filter(pk=booking_id).update(
        bale_notified_at=timezone.now() if ok else None,
        bale_notify_error='' if ok else (error or 'دلیل نامشخص')[:255],
    )


def notify_leader_of_booking(booking) -> bool:
    """
    خلاصه‌ی رزرو را به مدیر کاروان در بله می‌فرستد (بدون معطل‌کردن پاسخ کاربر).

    هر نتیجه‌ای — رسید، رد شد، یا اصلاً فرستاده نشد — روی همان رزرو ثبت
    می‌شود. True یعنی ارسال شروع شد، نه این‌که رسید.
    """
    if not bale.is_configured():
        _record(booking.pk, False, 'توکن ربات بله روی سرور تنظیم نشده است')
        return False

    chat_id = booking.caravan.notification_chat_id
    if not chat_id:
        logger.info(
            'بله: کاروان %s شناسه‌ی چت ندارد؛ اطلاع رزرو %s ارسال نشد.',
            booking.caravan_id, booking.booking_code or booking.id,
        )
        _record(booking.pk, False, 'نه کاروان و نه مدیرش شناسه‌ی چت بله ندارند')
        return False

    try:
        text = build_booking_summary(booking)
    except Exception:
        # ساختن متن هم نباید ثبت رزرو را خراب کند
        logger.exception('بله: ساختن خلاصه‌ی رزرو %s ناموفق بود.', booking.id)
        _record(booking.pk, False, 'ساختن متن خلاصه‌ی رزرو ناموفق بود')
        return False

    booking_id = booking.pk

    def on_done(ok, error):
        try:
            _record(booking_id, ok, error)
        finally:
            # این در ترد جداست و اتصال دیتابیس خودش را دارد
            connection.close()

    bale.send_message_async(chat_id, text, on_done=on_done)
    return True
