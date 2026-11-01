"""
ارسال پیام با ربات پیام‌رسان بله.

بله یک Bot API سازگار با تلگرام دارد؛ همان متد ``sendMessage`` با آدرس پایه‌ی
``https://tapi.bale.ai``. برای کار کردن این بخش دو چیز لازم است:

* ``BALE_BOT_TOKEN`` — توکن ربات از @BotFather بله.
* شناسه‌ی چت مخاطب (``chat_id``) — عددی که بله به هر گفتگو می‌دهد. مدیر کاروان
  باید یک‌بار به ربات پیام بدهد تا این شناسه ساخته شود؛ بعد با دستور
  ``python manage.py bale_chat_ids`` می‌توان آن را خواند و در پنل ثبت کرد.

ارسال پیام هیچ‌وقت نباید جریان اصلی (ثبت رزرو) را خراب کند، پس همه‌ی خطاها
اینجا گرفته و لاگ می‌شوند و تابع فقط True/False برمی‌گرداند.
"""

import logging
import re
import threading

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 10


def is_configured() -> bool:
    """آیا توکن ربات تنظیم شده است؟"""
    return bool(getattr(settings, 'BALE_BOT_TOKEN', ''))


def _api_url(method: str) -> str:
    base = getattr(settings, 'BALE_API_BASE', 'https://tapi.bale.ai').rstrip('/')
    return f"{base}/bot{settings.BALE_BOT_TOKEN}/{method}"


def _call(method: str, payload=None):
    """
    یک متد Bot API بله را صدا می‌زند: (result، خطا).

    خطا یک متن کوتاه فارسی است که روی خود رزرو هم ثبت می‌شود. متن استثناها
    عمداً لاگ نمی‌شود: آدرس درخواست توکن ربات را در خود دارد و requests آن را
    در پیام خطا تکرار می‌کند، یعنی توکن از راه لاگ نشت می‌کرد.
    """
    if not is_configured():
        logger.info('بله: توکن ربات تنظیم نشده است؛ درخواست %s ارسال نشد.', method)
        return None, 'توکن ربات بله روی سرور تنظیم نشده است'
    try:
        response = requests.post(_api_url(method), json=payload or {}, timeout=TIMEOUT_SECONDS)
    except requests.RequestException as exc:
        kind = exc.__class__.__name__
        logger.warning('بله: ارسال %s ناموفق بود — %s', method, kind)
        return None, f'سرور به بله وصل نشد ({kind})'

    try:
        data = response.json()
    except ValueError:
        logger.warning('بله: پاسخ %s قابل خواندن نبود (کد %s).', method, response.status_code)
        return None, f'پاسخ بله قابل خواندن نبود (کد {response.status_code})'

    if not data.get('ok'):
        description = data.get('description') or str(data)
        logger.warning('بله: %s رد شد — %s', method, description)
        return None, f'بله رد کرد: {description}'
    return data.get('result'), ''


def call(method: str, payload=None):
    """یک متد Bot API بله را صدا می‌زند و در صورت موفقیت ``result`` را برمی‌گرداند."""
    return _call(method, payload)[0]


def send_message_detailed(chat_id, text: str):
    """یک پیام متنی می‌فرستد: (موفق بود؟، دلیل در صورت شکست)."""
    if not chat_id or not text:
        return False, 'شناسه‌ی چت یا متن پیام خالی است'
    result, error = _call('sendMessage', {'chat_id': str(chat_id), 'text': text})
    return result is not None, error


def send_message(chat_id, text: str) -> bool:
    """یک پیام متنی به چت داده‌شده می‌فرستد."""
    return send_message_detailed(chat_id, text)[0]


def send_message_async(chat_id, text: str, on_done=None) -> None:
    """
    همان ``send_message`` ولی در یک ترد جداگانه.

    پاسخ HTTP کاربر نباید منتظر بله بماند؛ اگر بله کند باشد یا جواب ندهد،
    رزرو او باید همان لحظه ثبت‌شده اعلام شود. ``on_done(ok, error)`` بعد از
    ارسال در همان ترد صدا زده می‌شود تا نتیجه جایی ثبت شود.
    """
    if not chat_id or not text:
        return

    def run():
        ok, error = send_message_detailed(chat_id, text)
        if on_done is not None:
            try:
                on_done(ok, error)
            except Exception:
                logger.exception('بله: ثبت نتیجه‌ی ارسال ناموفق بود.')

    thread = threading.Thread(target=run, name='bale-send-message', daemon=True)
    thread.start()


def validate_bale_chat_id(value):
    """
    شناسه‌ی چت بله یک عدد است. رایج‌ترین اشتباه، نوشتن شماره موبایل مدیر به
    جای شناسه است — بله آن را با «chat not found» رد می‌کند و پیام هیچ‌وقت
    نمی‌رسد، بی‌آن‌که کسی بفهمد.
    """
    from django.core.exceptions import ValidationError

    text = str(value or '').strip()
    if not text:
        return
    if not re.fullmatch(r'-?[0-9]{5,20}', text):
        raise ValidationError('شناسه‌ی چت بله فقط عدد لاتین است، مثل 1832455804.')
    if text.startswith('0'):
        raise ValidationError(
            'این شبیه شماره موبایل است، نه شناسه‌ی چت بله. مدیر کاروان شناسه را با '
            '«دریافت کد اتصال» در داشبورد خودش ثبت می‌کند.'
        )
