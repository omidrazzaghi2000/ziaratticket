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


def call(method: str, payload=None):
    """یک متد Bot API بله را صدا می‌زند و در صورت موفقیت ``result`` را برمی‌گرداند."""
    if not is_configured():
        logger.info('بله: توکن ربات تنظیم نشده است؛ درخواست %s ارسال نشد.', method)
        return None
    try:
        response = requests.post(_api_url(method), json=payload or {}, timeout=TIMEOUT_SECONDS)
    except requests.RequestException as exc:
        logger.warning('بله: ارسال %s ناموفق بود — %s', method, exc)
        return None

    try:
        data = response.json()
    except ValueError:
        logger.warning('بله: پاسخ %s قابل خواندن نبود (کد %s).', method, response.status_code)
        return None

    if not data.get('ok'):
        logger.warning('بله: %s رد شد — %s', method, data.get('description') or data)
        return None
    return data.get('result')


def send_message(chat_id, text: str) -> bool:
    """یک پیام متنی به چت داده‌شده می‌فرستد."""
    if not chat_id or not text:
        return False
    result = call('sendMessage', {'chat_id': str(chat_id), 'text': text})
    return result is not None


def send_message_async(chat_id, text: str) -> None:
    """
    همان ``send_message`` ولی در یک ترد جداگانه.

    پاسخ HTTP کاربر نباید منتظر بله بماند؛ اگر بله کند باشد یا جواب ندهد،
    رزرو او باید همان لحظه ثبت‌شده اعلام شود.
    """
    if not chat_id or not text:
        return
    thread = threading.Thread(
        target=send_message,
        args=(chat_id, text),
        name='bale-send-message',
        daemon=True,
    )
    thread.start()
