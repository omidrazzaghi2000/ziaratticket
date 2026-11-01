"""
تاریخ شمسی در بک‌اند.

تاریخ‌های کاروان (حرکت، باز و بسته‌شدن ثبت‌نام) به‌صورت متن شمسی ذخیره
می‌شوند، مثل «۱۴۰۵/۰۸/۰۹». تا وقتی سرور نمی‌توانست این متن را به یک زمان
واقعی تبدیل کند، «ثبت‌نام از ۹ آبان» فقط یک برچسب بود و هیچ‌وقت خودبه‌خود
باز نمی‌شد. این ماژول همان تبدیل را انجام می‌دهد.

الگوریتم همان jalaali-js است که فرانت‌اند هم برای شمارش معکوس به کار می‌برد،
پس سرور و مرورگر سر یک روز اختلاف نظر پیدا نمی‌کنند.
"""

import re
from datetime import date, datetime, time, timedelta

from django.utils import timezone

from core.digits import to_latin_digits

_BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635,
           2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178]

_DATE_RE = re.compile(r'^(\d{4})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{1,2})$')


def _div(a, b):
    """تقسیم با گرد کردن به سمت صفر، مثل ~~(a/b) در جاوااسکریپت."""
    q = abs(a) // abs(b)
    return q if (a >= 0) == (b >= 0) else -q


def _mod(a, b):
    return a - _div(a, b) * b


def _jal_cal(jy):
    """(کبیسه‌بودن، سال میلادی، روز مارس که اول فروردین در آن است)"""
    gy = jy + 621
    leap_j = -14
    jp = _BREAKS[0]
    jump = 0
    for jm in _BREAKS[1:]:
        jump = jm - jp
        if jy < jm:
            break
        leap_j += _div(jump, 33) * 8 + _div(_mod(jump, 33), 4)
        jp = jm
    n = jy - jp
    leap_j += _div(n, 33) * 8 + _div(_mod(n, 33) + 3, 4)
    if _mod(jump, 33) == 4 and jump - n == 4:
        leap_j += 1
    leap_g = _div(gy, 4) - _div((_div(gy, 100) + 1) * 3, 4) - 150
    march = 20 + leap_j - leap_g
    if jump - n < 6:
        n = n - jump + _div(jump + 4, 33) * 33
    leap = _mod(_mod(n + 1, 33) - 1, 4)
    if leap == -1:
        leap = 4
    return leap == 0, gy, march


def _month_length(jy, jm):
    if jm <= 6:
        return 31
    if jm <= 11:
        return 30
    return 30 if _jal_cal(jy)[0] else 29


def jalali_to_gregorian(jy, jm, jd):
    """تاریخ شمسی → date میلادی."""
    _, gy, march = _jal_cal(jy)
    first_of_year = date(gy, 3, march)
    day_of_year = (jm - 1) * 31 - _div(jm, 7) * (jm - 7) + jd - 1
    return first_of_year + timedelta(days=day_of_year)


def parse_jalali_date(text):
    """
    «۱۴۰۵/۰۸/۰۹»، «1405-8-9» یا «۱۴۰۵.۰۸.۰۹» → date میلادی.

    هر متنی که دقیقاً یک تاریخ شمسی معتبر نباشد None برمی‌گرداند؛ «۳۱ مهر» یا
    «۱۴۰۵/۱۳/۰۱» نباید بی‌صدا به روز دیگری تبدیل شود.
    """
    if not text:
        return None
    m = _DATE_RE.match(to_latin_digits(str(text)).strip())
    if not m:
        return None
    jy, jm, jd = (int(g) for g in m.groups())
    if not (1300 <= jy <= 1500 and 1 <= jm <= 12):
        return None
    if not 1 <= jd <= _month_length(jy, jm):
        return None
    return jalali_to_gregorian(jy, jm, jd)


def jalali_moment(text, at=None, end_of_day=False):
    """
    تاریخ شمسی + ساعت اختیاری → datetime آگاه از منطقه‌ی زمانی تهران.

    بی‌ساعت، ابتدای همان روز در نظر گرفته می‌شود؛ یا اگر end_of_day باشد،
    آخرین لحظه‌ی آن روز («ثبت‌نام تا ۲۰ آبان» یعنی تمام روز ۲۰ آبان).
    """
    day = parse_jalali_date(text)
    if day is None:
        return None
    if at is not None:
        moment = datetime.combine(day, at)
    elif end_of_day:
        moment = datetime.combine(day, time.max)
    else:
        moment = datetime.combine(day, time.min)
    return timezone.make_aware(moment, timezone.get_default_timezone())
