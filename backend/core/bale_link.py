"""
وصل‌کردن حساب مدیر کاروان به چت بله — بدون دخالت ادمین.

مسیر کار: مدیر کاروان در داشبورد خودش یک «کد اتصال» می‌گیرد (کوتاه‌عمر و
یک‌بارمصرف)، همان کد را در بله برای ربات می‌فرستد، و ربات از طریق وب‌هوک به
همین ماژول می‌رسد و شناسه‌ی چت را روی حساب او ثبت می‌کند. از آن به بعد اطلاع
رزروها (``bookings/notifications.py``) خودبه‌خود به بله‌ی او می‌رود.

چرا کد و نه شماره‌ی موبایل؟ شماره‌ی تماس مدیر کاروان در صفحه‌ی کاروان دیده
می‌شود؛ اگر ربات با شماره وصل می‌کرد، هر کسی می‌توانست خودش را جای مدیر جا بزند
و اطلاع رزروهای آن کاروان را به چت خودش منحرف کند. کد فقط برای کسی ساخته می‌شود
که همان لحظه در داشبورد خودش وارد شده است.

مثل بقیه‌ی بخش بله، وقتی ``BALE_BOT_TOKEN`` خالی باشد هیچ‌چیز نمی‌شکند؛ فقط
پیامی ارسال نمی‌شود.
"""

import hmac
import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from core import bale
from core.digits import to_latin_digits

logger = logging.getLogger(__name__)

# کد اتصال: کوتاه که راحت در بله تایپ شود، ولی به‌اندازه‌ای بزرگ که حدس‌زدنی نباشد.
CODE_LENGTH = 8
CODE_TTL_MINUTES = 15
# حروف و ارقامی که با هم اشتباه نمی‌شوند (بدون 0/O و 1/I/L).
_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

START_MESSAGE = (
    'سلام! 🌙\n'
    'این ربات، اطلاع رزروهای کاروان شما را در بله می‌فرستد.\n\n'
    'برای وصل‌کردن حساب‌تان:\n'
    '۱) در سامانه وارد داشبورد مدیر کاروان شوید.\n'
    '۲) در بخش «اطلاع رزرو در بله» روی «دریافت کد اتصال» بزنید.\n'
    '۳) همان کد را اینجا برای من بفرستید.\n\n'
    'کد هشت‌حرفی است و تا ۱۵ دقیقه اعتبار دارد.'
)

INVALID_CODE_MESSAGE = (
    'این کد درست نیست یا منقضی شده است. ❌\n'
    'از داشبورد مدیر کاروان یک کد تازه بگیرید و همان را بفرستید.'
)

NOT_LEADER_MESSAGE = (
    'این کد به حساب مدیر کاروان تأییدشده وصل نیست. ❌\n'
    'اگر مدیر کاروان هستید و هنوز تأیید نشده‌اید، پس از تأیید ادمین دوباره تلاش کنید.'
)


def _now():
    return timezone.now()


def generate_code() -> str:
    """یک کد اتصال تازه می‌سازد."""
    return ''.join(secrets.choice(_CODE_ALPHABET) for _ in range(CODE_LENGTH))


def normalize_code(text):
    """
    متنی که کاربر در بله فرستاده را به کد تبدیل می‌کند.

    ارقام فارسی، حروف کوچک، فاصله و پیشوند «/» پذیرفته می‌شوند. هر چیزی که
    شکل کد نباشد ``None`` می‌گیرد تا گفتگوی معمولی با ربات بی‌جواب رد نشود.
    """
    if not isinstance(text, str):
        return None
    candidate = to_latin_digits(text).strip().lstrip('/').strip().upper()
    # «/connect ABCD1234» هم کار کند
    if ' ' in candidate:
        parts = [p for p in candidate.split() if p]
        if len(parts) != 2 or parts[0] not in ('CONNECT', 'CODE'):
            return None
        candidate = parts[1]
    if len(candidate) != CODE_LENGTH:
        return None
    if any(ch not in _CODE_ALPHABET for ch in candidate):
        return None
    return candidate


def issue_connect_code(user) -> str:
    """
    کد اتصال تازه برای این کاربر می‌سازد و ذخیره می‌کند.

    کد قبلی همان لحظه بی‌اعتبار می‌شود، پس هر مدیر کاروان در هر زمان فقط یک
    کد فعال دارد.
    """
    code = generate_code()
    user.bale_connect_code = code
    user.bale_connect_code_expiry = _now() + timedelta(minutes=CODE_TTL_MINUTES)
    user.save(update_fields=['bale_connect_code', 'bale_connect_code_expiry'])
    return code


def has_active_code(user) -> bool:
    """آیا کد اتصال فعلی کاربر هنوز معتبر است؟"""
    return bool(
        user.bale_connect_code
        and user.bale_connect_code_expiry
        and user.bale_connect_code_expiry > _now()
    )


def clear_connect_code(user) -> None:
    user.bale_connect_code = ''
    user.bale_connect_code_expiry = None
    user.save(update_fields=['bale_connect_code', 'bale_connect_code_expiry'])


def disconnect(user) -> None:
    """اتصال بله‌ی کاربر را برمی‌دارد؛ از این پس اطلاع رزرو به او نمی‌رود."""
    user.bale_chat_id = ''
    user.bale_connect_code = ''
    user.bale_connect_code_expiry = None
    user.save(update_fields=['bale_chat_id', 'bale_connect_code', 'bale_connect_code_expiry'])


def link_chat(code: str, chat_id):
    """
    شناسه‌ی چت را به صاحب این کد وصل می‌کند.

    خروجی: ``(user, reason)``. در موفقیت ``reason`` خالی است؛ در شکست ``user``
    خالی است و ``reason`` یکی از ``'invalid'`` (کد ناشناس/منقضی) یا
    ``'not_leader'`` (کد متعلق به کسی است که مدیر کاروان تأییدشده نیست).
    """
    # ایمپورت داخلی: ``accounts`` به ``core`` تکیه دارد و برعکسش نباید در
    # زمان بارگذاری ماژول اتفاق بیفتد.
    from accounts.models import User

    if not code or chat_id in (None, ''):
        return None, 'invalid'

    user = User.objects.filter(
        bale_connect_code=code,
        bale_connect_code_expiry__gt=_now(),
    ).first()
    if user is None:
        return None, 'invalid'

    if not user.is_caravan_leader:
        # کد را هم می‌سوزانیم تا دوباره امتحان نشود.
        clear_connect_code(user)
        return None, 'not_leader'

    chat_id = str(chat_id)
    # یک چت باید فقط به یک حساب وصل باشد؛ اتصال قبلی‌اش برداشته می‌شود.
    User.objects.filter(bale_chat_id=chat_id).exclude(pk=user.pk).update(bale_chat_id='')

    user.bale_chat_id = chat_id
    user.bale_connect_code = ''
    user.bale_connect_code_expiry = None
    user.save(update_fields=['bale_chat_id', 'bale_connect_code', 'bale_connect_code_expiry'])
    logger.info('بله: چت %s به کاربر %s وصل شد.', chat_id, user.pk)
    return user, ''


def success_message(user) -> str:
    name = user.full_name or user.phone
    return (
        f'حساب «{name}» با موفقیت به ربات وصل شد. ✅\n'
        'از این پس خلاصه‌ی هر رزرو تازه‌ی کاروان‌های شما همین‌جا فرستاده می‌شود.'
    )


def handle_update(update) -> bool:
    """
    یک آپدیت ربات بله را پردازش می‌کند.

    خروجی ``True`` یعنی کاری انجام شد. هر آپدیتی که پیام متنی نباشد یا شکل کد
    نداشته باشد بی‌صدا نادیده گرفته می‌شود؛ ربات نباید به هر حرفی جواب بدهد.
    """
    if not isinstance(update, dict):
        return False

    message = update.get('message') or update.get('edited_message') or {}
    if not isinstance(message, dict):
        return False
    chat = message.get('chat') or {}
    chat_id = chat.get('id') if isinstance(chat, dict) else None
    text = message.get('text')
    if chat_id in (None, '') or not isinstance(text, str) or not text.strip():
        return False

    if text.strip().lower().startswith('/start'):
        bale.send_message(chat_id, START_MESSAGE)
        return True

    code = normalize_code(text)
    if code is None:
        return False

    user, reason = link_chat(code, chat_id)
    if user is None:
        bale.send_message(chat_id, NOT_LEADER_MESSAGE if reason == 'not_leader' else INVALID_CODE_MESSAGE)
        return False

    bale.send_message(chat_id, success_message(user))
    return True


# ─── وب‌هوک ───────────────────────────────────────────────────────────────────

def secret_matches(secret) -> bool:
    """
    آیا رمز مسیر درخواست با رمز تنظیم‌شده یکی است؟

    رمز خالی یعنی وب‌هوک راه‌اندازی نشده و هر درخواستی رد می‌شود.
    """
    expected = getattr(settings, 'BALE_WEBHOOK_SECRET', '') or ''
    if not expected or not isinstance(secret, str) or not secret:
        return False
    return hmac.compare_digest(secret, expected)


def webhook_path() -> str:
    """مسیر وب‌هوک (بدون دامنه)، برای ساختن آدرس در دستور مدیریتی."""
    return f"/api/bale/webhook/{getattr(settings, 'BALE_WEBHOOK_SECRET', '')}"


def set_webhook(base_url: str):
    """وب‌هوک را روی بله ثبت می‌کند. ``base_url`` مثل ``https://ziaratticket.ir``."""
    url = base_url.rstrip('/') + webhook_path()
    return bale.call('setWebhook', {'url': url}), url


def delete_webhook():
    return bale.call('deleteWebhook')


def webhook_info():
    return bale.call('getWebhookInfo')
