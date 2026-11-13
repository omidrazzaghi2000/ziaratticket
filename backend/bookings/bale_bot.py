"""
ثبت‌نام زائر از داخل پیام‌رسان بله.

زائر بدون بازکردن سایت همه‌ی کارها را در گفتگو با ربات انجام می‌دهد: دیدن
کاروان‌ها، جزئیات هر کاروان، ثبت‌نام (سرپرست، همراهان، محل سوار شدن، صندلی،
درخواست خاص)، رسید، و فهرست رزروهایش.

چند اصل که بقیه‌ی فایل روی آن‌ها بنا شده:

* قواعد رزرو اینجا نیست. ربات فقط سؤال می‌پرسد و جواب جمع می‌کند؛ آخر کار همه
  را یک‌جا به ``services.place_booking`` می‌دهد — همان کدی که سایت اجرا می‌کند.
  پس ظرفیت، مهلت ثبت‌نام، صندلی و اطلاع به مدیر کاروان در هر دو یکی است.
* تا «تأیید نهایی» هیچ رزروی ساخته نمی‌شود. جواب‌های نیمه‌کاره در ``BaleChat``
  می‌مانند؛ گفتگویی که وسطش رها شود نه صندلی نگه می‌دارد نه ظرفیت.
* هویت زائر شماره‌ای است که خود بله تأیید کرده (دکمه‌ی «ارسال شماره‌ی من»).
  اگر بله مالکیت شماره را تأیید نکند — مثلاً کسی کارت مخاطب دیگری را بفرستد —
  کد پیامکی فرستاده می‌شود؛ وگرنه هر کس با فرستادن شماره‌ی دیگری رزروها و
  کد ملی او را می‌دید.
* پیام‌ها بعد از ثبت وضعیت در دیتابیس فرستاده می‌شوند، نه وسط آن.
"""

import logging
import random
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from carvans.models import Caravan
from core import bale, bale_link
from core.digits import to_latin_digits
from core.jalali import format_jalali_datetime

from . import services
from .models import BaleChat, Booking
from .serializers import validate_mobile, validate_national_id

logger = logging.getLogger(__name__)

# گفتگوی نیمه‌کاره بعد از این مدت کنار گذاشته می‌شود
SESSION_TTL = timedelta(hours=3)
OTP_TTL = timedelta(minutes=5)
OTP_MAX_TRIES = 5
MAX_LISTED = 15
SEATS_PER_ROW = 4

CANCEL_WORDS = {'/cancel', 'لغو', 'انصراف', '❌ انصراف'}
MENU_WORDS = {'/menu', 'منو', 'شروع', '/help'}

# مرحله‌هایی که جوابشان متن است (بقیه با دکمه جواب داده می‌شوند)
TEXT_STATES = {
    'contact', 'otp', 'first_name', 'last_name', 'national_id',
    'c_first', 'c_last', 'c_nid', 'c_phone', 'special', 'count',
}


def fa(value):
    """ارقام لاتین → فارسی، برای نمایش."""
    return str(value).translate(str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹'))


def money(value):
    return fa(f'{int(value or 0):,}') + ' تومان'


def price_label(caravan):
    """قیمت هر نفر، همان‌طور که مدیر کاروان گفته است."""
    return (caravan.price_text or '').strip() or money(caravan.price)


def normalize_phone(raw):
    """«+98912…»، «98912…» یا «0912…» → «0912…»؛ هر چیز دیگر None."""
    digits = ''.join(ch for ch in to_latin_digits(str(raw or '')) if ch.isdigit())
    if digits.startswith('0098'):
        digits = '0' + digits[4:]
    elif digits.startswith('98') and len(digits) == 12:
        digits = '0' + digits[2:]
    elif len(digits) == 10 and digits.startswith('9'):
        digits = '0' + digits
    try:
        return validate_mobile(digits)
    except Exception:
        return None


def btn(text, data):
    return {'text': text, 'callback_data': data}


class Turn:
    """یک آپدیت در حال پردازش: چت، و پیام‌هایی که باید بعد از commit فرستاده شوند."""

    def __init__(self, chat, message_id=None, callback_id=None):
        self.chat = chat
        self.message_id = message_id
        self.callback_id = callback_id
        self.toast_text = ''
        self.out = []

    # ── خروجی ──
    def say(self, text, rows=None, markup=None):
        payload = {'chat_id': self.chat.chat_id, 'text': text}
        if rows:
            payload['reply_markup'] = {'inline_keyboard': rows}
        elif markup:
            payload['reply_markup'] = markup
        self.out.append(('sendMessage', payload))

    def edit(self, text, rows):
        """پیامی که دکمه‌اش زده شده را سر جایش عوض می‌کند؛ اگر نشد، پیام تازه."""
        if not self.message_id:
            return self.say(text, rows)
        self.out.append(('editMessageText', {
            'chat_id': self.chat.chat_id, 'message_id': self.message_id,
            'text': text, 'reply_markup': {'inline_keyboard': rows},
        }))

    def toast(self, text):
        self.toast_text = text

    def flush(self):
        if self.callback_id:
            # بله دکمه را تا رسیدن این پاسخ در حالت انتظار نگه می‌دارد
            payload = {'callback_query_id': self.callback_id}
            if self.toast_text:
                payload['text'] = self.toast_text[:200]
            bale.call('answerCallbackQuery', payload)
        for method, payload in self.out:
            result = bale.call(method, payload)
            if result is None and method == 'editMessageText':
                payload = {k: v for k, v in payload.items() if k != 'message_id'}
                bale.call('sendMessage', payload)

    # ── وضعیت ──
    @property
    def data(self):
        return self.chat.data

    def go(self, state):
        self.chat.state = state

    def reset(self):
        self.chat.state = ''
        self.chat.data = {}


# ─── ورودی ────────────────────────────────────────────────────────────────────

def handle_update(update) -> bool:
    """یک آپدیت وب‌هوک بله را پردازش می‌کند. ``True`` یعنی به آن رسیدگی شد."""
    if not isinstance(update, dict):
        return False

    callback = update.get('callback_query')
    message = update.get('message')
    if isinstance(callback, dict):
        message = callback.get('message') if isinstance(callback.get('message'), dict) else {}
        sender = callback.get('from') or {}
    elif isinstance(message, dict):
        callback = None
        sender = message.get('from') or {}
    else:
        return False

    chat_info = message.get('chat') or {}
    chat_id = chat_info.get('id') if isinstance(chat_info, dict) else None
    if chat_id in (None, ''):
        return False
    # فرم رزرو اطلاعات شخصی می‌گیرد؛ فقط در گفتگوی خصوصی
    if chat_info.get('type') not in (None, 'private'):
        return False

    update_id = update.get('update_id')
    turn = None
    try:
        with transaction.atomic():
            chat, _ = BaleChat.objects.select_for_update().get_or_create(chat_id=str(chat_id))
            # بله اگر پاسخ ۲۰۰ را نگیرد همان آپدیت را دوباره می‌فرستد
            if isinstance(update_id, int) and update_id == chat.last_update_id:
                return False
            if chat.state and chat.updated_at and timezone.now() - chat.updated_at > SESSION_TTL:
                chat.state, chat.data = '', {}

            turn = Turn(
                chat,
                message_id=message.get('message_id'),
                callback_id=callback.get('id') if callback else None,
            )
            if callback:
                _on_callback(turn, str(callback.get('data') or ''))
            else:
                turn.message_id = None
                _on_message(turn, update, message, sender)

            if isinstance(update_id, int):
                chat.last_update_id = update_id
            chat.save()
    except Exception:
        logger.exception('بله: پردازش گفتگوی چت %s ناموفق بود.', chat_id)
        bale.call('sendMessage', {
            'chat_id': str(chat_id),
            'text': 'مشکلی پیش آمد و این مرحله ثبت نشد. لطفاً دوباره تلاش کنید یا «منو» را بفرستید.',
        })
        return False

    turn.flush()
    return True


def _on_message(turn, update, message, sender):
    contact = message.get('contact')
    if isinstance(contact, dict):
        return _on_contact(turn, contact, sender)

    text = message.get('text')
    if not isinstance(text, str) or not text.strip():
        return
    text = text.strip()
    lowered = text.lower()

    if lowered.startswith('/start') or lowered in MENU_WORDS:
        turn.reset()
        return show_menu(turn, greet=True)
    if lowered in CANCEL_WORDS:
        was_busy = bool(turn.chat.state)
        turn.reset()
        turn.say('فرم بسته شد؛ چیزی ثبت نشد.' if was_busy else 'باشد.', markup={'remove_keyboard': True})
        return show_menu(turn)

    state = turn.chat.state
    if state in TEXT_STATES:
        return TEXT_HANDLERS[state](turn, text)
    if state:
        return turn.say('برای این مرحله از دکمه‌های زیر همان پیام استفاده کنید، یا «انصراف» را بفرستید.')

    # مدیر کاروان کد اتصال داشبوردش را می‌فرستد — همان مسیر قبلی
    if bale_link.normalize_code(text) is not None:
        bale_link.handle_update(update)
        return
    show_menu(turn)


def _on_callback(turn, data):
    key, _, arg = data.partition(':')
    handler = CALLBACKS.get(key)
    if handler is None:
        return turn.toast('این دکمه دیگر فعال نیست.')
    handler(turn, arg)


# ─── منو و کاروان‌ها ──────────────────────────────────────────────────────────

def listed_caravans(destination=None):
    """کاروان‌هایی که سایت هم نشان می‌دهد، نزدیک‌ترین حرکت اول."""
    qs = Caravan.objects.filter(status='approved')
    if destination:
        qs = qs.filter(destination=destination)
    now = timezone.now()
    caravans = [c for c in qs if c.is_listed(now)]
    far = timezone.localdate() + timedelta(days=36500)
    caravans.sort(key=lambda c: (c.departure_day or far, c.id))
    return caravans


def show_menu(turn, greet=False, edit=False):
    caravans = listed_caravans()
    labels = dict(Caravan.DESTINATION_CHOICES)
    rows = []
    for dest in dict.fromkeys(c.destination for c in caravans):
        count = sum(1 for c in caravans if c.destination == dest)
        rows.append([btn(f'🕌 کاروان‌های {labels.get(dest, dest)} ({fa(count)})', f'd:{dest}')])
    rows.append([btn('🧾 رزروهای من', 'my')])
    rows.append([btn('مدیر کاروان هستم', 'ld')])
    if turn.chat.user_id:
        rows.append([btn(f'خروج از حساب {fa(turn.chat.user.phone)}', 'out')])

    lines = []
    if greet:
        lines += ['سلام! 🌙 به ربات «زیارت تیکت» خوش آمدید.', '']
    lines.append('از همین‌جا می‌توانید کاروان‌ها را ببینید و ثبت‌نام کنید.')
    if not caravans:
        lines.append('در حال حاضر کاروان فعالی برای ثبت‌نام نیست.')
    text = '\n'.join(lines)
    (turn.edit if edit else turn.say)(text, rows)


def cb_menu(turn, arg):
    turn.reset()
    show_menu(turn, edit=True)


def cb_destination(turn, dest):
    turn.reset()
    caravans = listed_caravans(dest)[:MAX_LISTED]
    title = dict(Caravan.DESTINATION_CHOICES).get(dest, 'کاروان‌ها')
    if not caravans:
        return turn.edit(f'برای {title} فعلاً کاروانی نیست.', [[btn('بازگشت به منو', 'm')]])

    lines = [f'کاروان‌های {title} — نزدیک‌ترین حرکت اول:', '']
    rows = []
    for i, c in enumerate(caravans, start=1):
        lines += [
            f'{fa(i)}) {c.name}',
            f'   حرکت {fa(c.departure_date)} · {fa(c.duration)} روز · {fa(c.availability_label)}',
            f'   قیمت هر نفر: {fa(price_label(c))}',
            '',
        ]
        rows.append([btn(f'{fa(i)}) {c.name[:40]}', f'c:{c.id}')])
    rows.append([btn('بازگشت به منو', 'm')])
    lines.append('برای جزئیات و ثبت‌نام، کاروان را انتخاب کنید.')
    turn.edit('\n'.join(lines), rows)


def _get_caravan(turn, raw_id):
    try:
        caravan = Caravan.objects.select_related('leader').get(pk=int(raw_id), status='approved')
    except (Caravan.DoesNotExist, ValueError, TypeError):
        turn.toast('این کاروان دیگر در دسترس نیست.')
        return None
    return caravan


def transport_label(c):
    label = c.get_transportation_type_display()
    if c.transportation_type == 'train' and c.train_type:
        label += f' — {c.get_train_type_display()}'
    elif c.is_ground_transport and c.bus_type:
        label += f' — {fa(c.bus_type)} نفره'
    return label


def leader_phone(c):
    return c.contact_phone or (c.leader.phone if c.leader_id else '')


def cb_caravan(turn, raw_id):
    turn.reset()
    c = _get_caravan(turn, raw_id)
    if c is None:
        return
    services_list = [name for flag, name in (
        (c.meal_breakfast, 'صبحانه'), (c.meal_lunch, 'ناهار'), (c.meal_dinner, 'شام'),
        (c.has_insurance, 'بیمه مسافرتی'),
    ) if flag]
    stay = c.get_accommodation_type_display()
    if c.accommodation_name:
        stay += f' — {c.accommodation_name}'

    lines = [
        f'🕌 {c.name}',
        f'مقصد: {c.get_destination_display()}',
        f'تاریخ حرکت: {fa(c.departure_date)} ({fa(c.duration)} روزه)',
        f'حمل‌ونقل: {transport_label(c)}',
        f'اقامتگاه: {stay}',
    ]
    if c.boarding_options:
        lines.append('محل‌های سوار شدن: ' + '، '.join(c.boarding_options))
    if services_list:
        lines.append('خدمات: ' + '، '.join(services_list))
    lines += ['', f'قیمت هر نفر: {fa(price_label(c))}', f'وضعیت: {fa(c.availability_label)}']
    if (c.description or '').strip():
        lines += ['', c.description.strip()[:600]]
    if (c.rules or '').strip():
        lines += ['', 'قوانین کاروان:', c.rules.strip()[:600]]
    phone = leader_phone(c)
    if phone:
        lines += ['', f'تماس با مسئول کاروان: {fa(phone)}']

    rows = []
    if c.is_bookable:
        rows.append([btn('✅ ثبت‌نام و رزرو', f'b:{c.id}')])
    rows.append([btn('بازگشت به فهرست', f'd:{c.destination}'), btn('منو', 'm')])
    turn.edit('\n'.join(lines), rows)


def cb_leader_guide(turn, arg):
    turn.say(bale_link.START_MESSAGE, [[btn('بازگشت به منو', 'm')]])


# ─── تأیید شماره ──────────────────────────────────────────────────────────────

CONTACT_KEYBOARD = {'keyboard': [
    [{'text': '📱 ارسال شماره‌ی من', 'request_contact': True}],
    [{'text': '❌ انصراف'}],
]}


def ask_contact(turn):
    turn.go('contact')
    turn.say(
        'برای ثبت‌نام باید شماره موبایل‌تان تأیید شود؛ رزرو به نام همین شماره ثبت می‌شود '
        'و با همان می‌توانید در سایت هم آن را ببینید.\n\n'
        'دکمه‌ی «📱 ارسال شماره‌ی من» را در پایین صفحه بزنید.',
        markup=CONTACT_KEYBOARD,
    )


def _on_contact(turn, contact, sender):
    if turn.chat.state not in ('contact', 'otp'):
        return turn.say('شماره دریافت شد، ولی الان لازمش نداریم. برای شروع «منو» را بفرستید.')
    phone = normalize_phone(contact.get('phone_number'))
    if phone is None:
        return turn.say('این شماره موبایل ایران نیست. ثبت‌نام فقط با شماره‌ی ۰۹… ممکن است.')

    owner, sender_id = contact.get('user_id'), sender.get('id', turn.chat.chat_id)
    if owner is not None and str(owner) == str(sender_id):
        return link_account(turn, phone, contact.get('first_name') or '')
    # بله نگفته این شماره مال فرستنده است (یا کارت مخاطب کس دیگری است)
    logger.info('بله: مخاطب بدون تأیید مالکیت در چت %s؛ کد پیامکی فرستاده شد.', turn.chat.chat_id)
    send_otp(turn, phone)


def text_contact(turn, text):
    """زائر به جای دکمه، شماره را تایپ کرده است."""
    phone = normalize_phone(text)
    if phone is None:
        return turn.say('دکمه‌ی «📱 ارسال شماره‌ی من» را بزنید، یا شماره موبایل‌تان را به شکل ۰۹۱۲۳۴۵۶۷۸۹ بنویسید.')
    send_otp(turn, phone)


def send_otp(turn, phone):
    from accounts.views import _send_otp_sms

    last = turn.data.get('otp_sent_at')
    if last and timezone.now().timestamp() - last < 60:
        return turn.say('کد همین الان فرستاده شد؛ یک دقیقه صبر کنید و بعد دوباره تلاش کنید.')
    code = f'{random.SystemRandom().randint(0, 99999):05d}'
    turn.data.update({
        'otp_phone': phone, 'otp_code': code, 'otp_tries': 0,
        'otp_sent_at': timezone.now().timestamp(),
    })
    turn.go('otp')
    _send_otp_sms(phone, code)
    turn.say(
        f'یک کد تأیید به {fa(phone)} پیامک شد. همان کد را اینجا بفرستید.\n(تا ۵ دقیقه معتبر است)',
        markup={'remove_keyboard': True},
    )


def text_otp(turn, text):
    data = turn.data
    expired = timezone.now().timestamp() - data.get('otp_sent_at', 0) > OTP_TTL.total_seconds()
    tries = int(data.get('otp_tries', 0)) + 1
    data['otp_tries'] = tries
    if expired or tries > OTP_MAX_TRIES:
        pending = data.get('caravan_id')
        turn.reset()
        if pending:
            turn.data['caravan_id'] = pending
        turn.say('کد منقضی شد.' if expired else 'تعداد تلاش‌ها زیاد شد.')
        return ask_contact(turn)
    if to_latin_digits(text).strip() != data.get('otp_code'):
        return turn.say('کد درست نیست. دوباره بفرستید.')
    link_account(turn, data['otp_phone'], '')


def link_account(turn, phone, first_name):
    from accounts.models import User

    user = User.objects.filter(phone=phone).first()
    if user is None:
        user = User.objects.create_user(phone=phone, full_name=first_name or None)
    if not user.is_active:
        turn.reset()
        return turn.say('این حساب غیرفعال است. با پشتیبانی تماس بگیرید.', markup={'remove_keyboard': True})
    if not user.is_verified:
        user.is_verified = True
        user.save(update_fields=['is_verified'])

    turn.chat.user = user
    pending, after = turn.data.get('caravan_id'), turn.data.get('after')
    turn.reset()
    turn.say(f'شماره‌ی {fa(phone)} تأیید شد. ✅', markup={'remove_keyboard': True})
    if pending:
        caravan = Caravan.objects.filter(pk=pending, status='approved').first()
        if caravan:
            return begin_form(turn, caravan)
    if after == 'my':
        return show_my_bookings(turn)
    show_menu(turn)


def cb_logout(turn, arg):
    turn.chat.user = None
    turn.reset()
    turn.toast('از حساب خارج شدید.')
    show_menu(turn, edit=True)


# ─── فرم رزرو ─────────────────────────────────────────────────────────────────

def cb_book(turn, raw_id):
    turn.reset()
    caravan = _get_caravan(turn, raw_id)
    if caravan is None:
        return
    error = services.opening_error(caravan, 1)
    if error:
        return turn.say(error, [[btn('بازگشت به منو', 'm')]])
    if not turn.chat.user_id:
        turn.data['caravan_id'] = caravan.id
        return ask_contact(turn)
    begin_form(turn, caravan)


def begin_form(turn, caravan):
    turn.chat.data = {'caravan_id': caravan.id, 'companions': [], 'seats': []}
    turn.go('first_name')
    rows = []
    last = (Booking.objects.filter(user=turn.chat.user, is_completed=True)
            .exclude(main_passenger_id='').order_by('-created_at').first())
    if last and last.main_passenger_first_name and last.main_passenger_last_name:
        rows.append([btn(f'همان قبلی: {last.main_passenger_name}', 'same')])
    rows.append([btn('❌ انصراف', 'x')])
    turn.say(
        f'ثبت‌نام در «{caravan.name}»\n\n'
        'اول مشخصات سرپرست (مسافر اصلی).\n'
        'نام سرپرست را بنویسید:',
        rows,
    )


def _form_caravan(turn):
    """کاروان فرم جاری؛ اگر دیگر نیست فرم بسته می‌شود."""
    caravan = Caravan.objects.select_related('leader').filter(
        pk=turn.data.get('caravan_id'), status='approved').first()
    if caravan is None:
        turn.reset()
        turn.say('این کاروان دیگر در دسترس نیست.', [[btn('بازگشت به منو', 'm')]])
    return caravan


def _name(text):
    text = ' '.join(text.split())
    return text if 2 <= len(text) <= 50 and not any(ch.isdigit() for ch in text) else None


def cb_same(turn, arg):
    if turn.chat.state != 'first_name':
        return turn.toast('این دکمه دیگر فعال نیست.')
    last = (Booking.objects.filter(user=turn.chat.user, is_completed=True)
            .exclude(main_passenger_id='').order_by('-created_at').first())
    if not last:
        return turn.toast('رزرو قبلی پیدا نشد.')
    turn.data.update({
        'first_name': last.main_passenger_first_name,
        'last_name': last.main_passenger_last_name,
        'national_id': last.main_passenger_id,
    })
    ask_count(turn)


def text_first_name(turn, text):
    name = _name(text)
    if not name:
        return turn.say('نام باید دست‌کم ۲ حرف و بدون عدد باشد. دوباره بنویسید:')
    turn.data['first_name'] = name
    turn.go('last_name')
    turn.say('نام خانوادگی سرپرست:')


def text_last_name(turn, text):
    name = _name(text)
    if not name:
        return turn.say('نام خانوادگی باید دست‌کم ۲ حرف و بدون عدد باشد. دوباره بنویسید:')
    turn.data['last_name'] = name
    turn.go('national_id')
    turn.say('کد ملی سرپرست (۱۰ رقم):')


def _national_id(text):
    try:
        return validate_national_id(text)
    except Exception:
        return None


def text_national_id(turn, text):
    nid = _national_id(text)
    if not nid:
        return turn.say('کد ملی باید ۱۰ رقم باشد. دوباره بفرستید:')
    turn.data['national_id'] = nid
    ask_count(turn)


def ask_count(turn):
    caravan = _form_caravan(turn)
    if caravan is None:
        return
    limit = max(1, min(10, caravan.remaining_capacity or 0))
    labels = [btn('۱ نفر (فقط خودم)', 'n:1')] + [btn(f'{fa(n)} نفر', f'n:{n}') for n in range(2, limit + 1)]
    rows = [labels[:1]] + [labels[i:i + 3] for i in range(1, len(labels), 3)]
    rows.append([btn('❌ انصراف', 'x')])
    turn.go('count')
    d = turn.data
    turn.say(
        f'سرپرست: {d["first_name"]} {d["last_name"]} — کد ملی {d["national_id"]}\n\n'
        'با خودتان چند نفر هستید؟',
        rows,
    )


def text_count(turn, text):
    digits = to_latin_digits(text).strip()
    if digits.isdigit():
        return cb_count(turn, digits)
    turn.say('تعداد مسافر را با دکمه‌های همان پیام انتخاب کنید.')


def cb_count(turn, arg):
    if turn.chat.state != 'count':
        return turn.toast('این دکمه دیگر فعال نیست.')
    caravan = _form_caravan(turn)
    if caravan is None:
        return
    count = int(arg) if str(arg).isdigit() else 0
    if not 1 <= count <= 10:
        return turn.toast('تعداد مسافر باید بین ۱ تا ۱۰ باشد.')
    error = services.opening_error(caravan, count)
    if error:
        turn.toast(error)
        return turn.say(error)
    turn.data['count'] = count

    options = caravan.boarding_options
    if len(options) > 1:
        turn.go('boarding')
        rows = [[btn(city, f'bc:{i}') for i, city in enumerate(options)][j:j + 2] for j in range(0, len(options), 2)]
        rows.append([btn('❌ انصراف', 'x')])
        return turn.say('از کدام شهر سوار می‌شوید؟', rows)
    turn.data['boarding'] = options[0] if options else ''
    next_companion(turn, caravan)


def cb_boarding(turn, arg):
    if turn.chat.state != 'boarding':
        return turn.toast('این دکمه دیگر فعال نیست.')
    caravan = _form_caravan(turn)
    if caravan is None:
        return
    options = caravan.boarding_options
    if not arg.isdigit() or int(arg) >= len(options):
        return turn.toast('این شهر در مسیر کاروان نیست.')
    turn.data['boarding'] = options[int(arg)]
    next_companion(turn, caravan)


def next_companion(turn, caravan):
    """همراه بعدی را می‌پرسد، یا اگر همه ثبت شده‌اند به مرحله‌ی بعد می‌رود."""
    done, needed = len(turn.data['companions']), turn.data['count'] - 1
    if done >= needed:
        return ask_seats(turn, caravan)
    turn.data['cur'] = {}
    turn.go('c_first')
    turn.say(f'همراه {fa(done + 1)} از {fa(needed)}\nنام همراه را بنویسید:')


def text_c_first(turn, text):
    name = _name(text)
    if not name:
        return turn.say('نام باید دست‌کم ۲ حرف و بدون عدد باشد. دوباره بنویسید:')
    turn.data['cur'] = {'firstName': name}
    turn.go('c_last')
    turn.say('نام خانوادگی همراه:')


def text_c_last(turn, text):
    name = _name(text)
    if not name:
        return turn.say('نام خانوادگی باید دست‌کم ۲ حرف و بدون عدد باشد. دوباره بنویسید:')
    turn.data['cur']['lastName'] = name
    turn.go('c_nid')
    turn.say('کد ملی همراه (۱۰ رقم):')


def text_c_nid(turn, text):
    nid = _national_id(text)
    if not nid:
        return turn.say('کد ملی باید ۱۰ رقم باشد. دوباره بفرستید:')
    used = {turn.data['national_id']} | {c['nationalId'] for c in turn.data['companions']}
    if nid in used:
        return turn.say('این کد ملی قبلاً در همین رزرو ثبت شده است. کد ملی خود همراه را بفرستید:')
    turn.data['cur']['nationalId'] = nid
    turn.go('c_phone')
    turn.say('شماره موبایل همراه (اختیاری):', [[btn('ندارد / رد کردن', 'skip')]])


def text_c_phone(turn, text):
    phone = normalize_phone(text)
    if phone is None:
        return turn.say('شماره باید ۱۱ رقم و با ۰۹ شروع شود. دوباره بفرستید یا «رد کردن» را بزنید:',
                        [[btn('ندارد / رد کردن', 'skip')]])
    _save_companion(turn, phone)


def _save_companion(turn, phone):
    caravan = _form_caravan(turn)
    if caravan is None:
        return
    cur = dict(turn.data.get('cur') or {}, phone=phone)
    turn.data['companions'].append(cur)
    turn.data['cur'] = {}
    next_companion(turn, caravan)


def cb_skip(turn, arg):
    state = turn.chat.state
    if state == 'c_phone':
        return _save_companion(turn, '')
    if state == 'special':
        turn.data['special'] = ''
        return show_summary(turn)
    turn.toast('این دکمه دیگر فعال نیست.')


# ── صندلی ──

def ask_seats(turn, caravan, edit=False):
    if not caravan.seat_selection_active:
        turn.data['seats'] = []
        return ask_special(turn)
    turn.go('seats')
    turn.data.setdefault('seat_page', 0)
    text, rows = seat_picker(turn, caravan)
    (turn.edit if edit else turn.say)(text, rows)


def seat_picker(turn, caravan):
    """صندلی‌های یک اتوبوس به شکل دکمه: آزاد، انتخاب‌شده (✅) یا گرفته‌شده (✖️)."""
    count, chosen = turn.data['count'], turn.data.get('seats', [])
    capacity = caravan.capacity or 0
    per_bus = caravan.bus_type or capacity or 1
    buses = max(1, -(-capacity // per_bus))
    page = min(max(int(turn.data.get('seat_page', 0)), 0), buses - 1)
    turn.data['seat_page'] = page
    occupied = services.occupied_seats_for(caravan)

    first, last = page * per_bus + 1, min(capacity, (page + 1) * per_bus)
    cells = []
    for n in range(first, last + 1):
        if n in chosen:
            cells.append(btn(f'✅ {fa(n)}', f's:{n}'))
        elif n in occupied:
            cells.append(btn('✖️', 'no'))
        else:
            cells.append(btn(fa(n), f's:{n}'))
    rows = [cells[i:i + SEATS_PER_ROW] for i in range(0, len(cells), SEATS_PER_ROW)]
    if buses > 1:
        nav = []
        if page > 0:
            nav.append(btn(f'◀️ اتوبوس {fa(page)}', f'sp:{page - 1}'))
        if page < buses - 1:
            nav.append(btn(f'اتوبوس {fa(page + 2)} ▶️', f'sp:{page + 1}'))
        rows.append(nav)
    rows.append([btn(f'تأیید صندلی‌ها ({fa(len(chosen))} از {fa(count)})', 'sok')])
    rows.append([btn('❌ انصراف', 'x')])

    lines = [f'برای هر مسافر یک صندلی انتخاب کنید ({fa(count)} صندلی).']
    if buses > 1:
        lines.append(f'اتوبوس {fa(page + 1)} از {fa(buses)}')
    lines.append('انتخاب‌شده: ' + ('، '.join(fa(s) for s in sorted(chosen)) if chosen else '—'))
    lines.append('✖️ یعنی قبلاً رزرو شده.')
    return '\n'.join(lines), rows


def _seat_step(turn):
    if turn.chat.state != 'seats':
        turn.toast('این دکمه دیگر فعال نیست.')
        return None
    return _form_caravan(turn)


def cb_seat(turn, arg):
    caravan = _seat_step(turn)
    if caravan is None:
        return
    seat = int(arg) if arg.isdigit() else 0
    chosen = turn.data.setdefault('seats', [])
    if seat in chosen:
        chosen.remove(seat)
    elif not 1 <= seat <= (caravan.capacity or 0):
        return turn.toast('این صندلی وجود ندارد.')
    elif seat in services.occupied_seats_for(caravan):
        turn.toast('این صندلی همین الان رزرو شد.')
    elif len(chosen) >= turn.data['count']:
        return turn.toast(f'بیشتر از {fa(turn.data["count"])} صندلی نمی‌شود؛ اول یکی را بردارید.')
    else:
        chosen.append(seat)
    turn.edit(*seat_picker(turn, caravan))


def cb_seat_page(turn, arg):
    caravan = _seat_step(turn)
    if caravan is None:
        return
    turn.data['seat_page'] = int(arg) if arg.isdigit() else 0
    turn.edit(*seat_picker(turn, caravan))


def cb_seat_taken(turn, arg):
    turn.toast('این صندلی قبلاً رزرو شده است.')


def cb_seats_done(turn, arg):
    caravan = _seat_step(turn)
    if caravan is None:
        return
    error = services.seats_error(caravan, turn.data['count'], turn.data.get('seats', []))
    if error:
        turn.toast(error)
        # اگر صندلی‌ای در این فاصله گرفته شده، از انتخاب‌ها برداشته شود
        occupied = services.occupied_seats_for(caravan)
        turn.data['seats'] = [s for s in turn.data.get('seats', []) if s not in occupied]
        return turn.edit(*seat_picker(turn, caravan))
    ask_special(turn)


# ── درخواست خاص و تأیید ──

def ask_special(turn):
    turn.go('special')
    turn.say('درخواست خاصی دارید؟ (مثلاً ویلچر، رژیم غذایی)\nبنویسید، یا «ندارم» را بزنید.',
             [[btn('ندارم', 'skip')], [btn('❌ انصراف', 'x')]])


def text_special(turn, text):
    turn.data['special'] = text[:500]
    show_summary(turn)


def show_summary(turn):
    caravan = _form_caravan(turn)
    if caravan is None:
        return
    d = turn.data
    lines = [
        'لطفاً اطلاعات را بررسی کنید:',
        '',
        f'کاروان: {caravan.name}',
        f'تاریخ حرکت: {fa(caravan.departure_date)}',
        f'سرپرست: {d["first_name"]} {d["last_name"]} — کد ملی {d["national_id"]}',
        f'موبایل: {fa(turn.chat.user.phone)}',
        f'تعداد مسافر: {fa(d["count"])} نفر',
    ]
    for i, c in enumerate(d['companions'], start=1):
        phone = f' — {fa(c["phone"])}' if c.get('phone') else ''
        lines.append(f'همراه {fa(i)}: {c["firstName"]} {c["lastName"]} — کد ملی {c["nationalId"]}{phone}')
    if d.get('boarding'):
        lines.append(f'محل سوار شدن: {d["boarding"]}')
    if d.get('seats'):
        lines.append('صندلی‌ها: ' + '، '.join(fa(s) for s in sorted(d['seats'])))
    if d.get('special'):
        lines.append(f'درخواست خاص: {d["special"]}')
    lines += ['', f'مبلغ کل: {money(caravan.price * d["count"])}']
    if (caravan.price_text or '').strip():
        lines.append(f'قیمت اعلامی کاروان برای هر نفر: {fa(caravan.price_text.strip())}')
    turn.go('confirm')
    turn.say('\n'.join(lines), [
        [btn('✅ اطلاعات درست است، ثبت کن', 'ok')],
        [btn('❌ انصراف', 'x')],
    ])


def cb_confirm(turn, arg):
    if turn.chat.state != 'confirm':
        return turn.toast('این فرم قبلاً بسته شده است.')
    caravan = _form_caravan(turn)
    if caravan is None:
        return
    d = turn.data
    try:
        booking = services.place_booking(
            turn.chat.user, caravan,
            first_name=d['first_name'], last_name=d['last_name'], national_id=d['national_id'],
            phone=turn.chat.user.phone, passenger_count=d['count'],
            boarding_city=d.get('boarding', ''), companions=d['companions'],
            selected_seats=d.get('seats', []), special_requests=d.get('special', ''),
            source='bale',
        )
    except services.BookingError as exc:
        if exc.code == 'seats':
            # فقط صندلی از دست رفته؛ بقیه‌ی فرم سر جایش می‌ماند
            turn.data['seats'] = []
            turn.say(exc.message)
            return ask_seats(turn, caravan)
        turn.reset()
        return turn.say(f'رزرو ثبت نشد: {exc.message}', [[btn('بازگشت به منو', 'm')]])

    turn.reset()
    turn.say(receipt_text(booking, fresh=True), [[btn('🧾 رزروهای من', 'my')], [btn('منو', 'm')]])


def cb_cancel_form(turn, arg):
    was_busy = bool(turn.chat.state)
    turn.reset()
    turn.toast('فرم بسته شد.' if was_busy else '')
    turn.say('فرم بسته شد؛ چیزی ثبت نشد.', markup={'remove_keyboard': True})
    show_menu(turn)


# ─── رسید و رزروهای من ────────────────────────────────────────────────────────

STATUS_LABELS = dict(Booking.STATUS_CHOICES)


def receipt_text(booking, fresh=False):
    c = booking.caravan
    lines = ['✅ رزرو شما ثبت شد.' if fresh else '🧾 جزئیات رزرو', '']
    lines += [
        f'کد رزرو: {booking.booking_code or booking.id}',
        f'کاروان: {c.name}',
        f'تاریخ حرکت: {fa(c.departure_date)} ({fa(c.duration)} روزه)',
        f'سرپرست: {booking.main_passenger_name}',
        f'تعداد مسافر: {fa(booking.passenger_count)} نفر',
    ]
    names = [x.get('name') or f"{x.get('firstName', '')} {x.get('lastName', '')}".strip()
             for x in (booking.companions or [])]
    if names:
        lines.append('همراهان: ' + '، '.join(names))
    if booking.selected_seats:
        lines.append('صندلی‌ها: ' + '، '.join(fa(s) for s in booking.selected_seats))
    if booking.boarding_city:
        lines.append(f'محل سوار شدن: {booking.boarding_city}')
    lines.append(f'مبلغ کل: {money(booking.total_price)}')
    if (c.price_text or '').strip():
        lines.append(f'قیمت اعلامی کاروان برای هر نفر: {fa(c.price_text.strip())}')
    if not fresh:
        lines.append(f'وضعیت: {STATUS_LABELS.get(booking.status, booking.status)}')
    lines.append(f'زمان ثبت: {fa(format_jalali_datetime(booking.created_at))}')

    lines.append('')
    if booking.status == 'cancelled':
        lines.append('این رزرو لغو شده است.')
    elif booking.is_paid:
        lines.append('💚 پرداخت انجام شده است.')
    elif booking.payment_link:
        lines.append('🔴 در انتظار پرداخت — برای تکمیل رزرو از دکمه‌ی «پرداخت آنلاین» استفاده کنید.')
    else:
        phone = leader_phone(c)
        lines.append(
            '🔴 در انتظار پرداخت — لینک پرداخت پس از تأیید نهایی مسئول کاروان'
            + (f'، با شماره {fa(phone)}' if phone else '') + ' ارسال می‌گردد. کد رزرو را نگه دارید.'
        )
    if fresh:
        lines.append('این رزرو با همین شماره در سایت هم دیده می‌شود.')
    return '\n'.join(lines)


def cb_my(turn, arg):
    turn.reset()
    if not turn.chat.user_id:
        turn.data['after'] = 'my'
        return ask_contact(turn)
    show_my_bookings(turn)


def show_my_bookings(turn):
    bookings = list(Booking.objects.filter(user=turn.chat.user, is_completed=True)
                    .select_related('caravan').order_by('-created_at')[:10])
    if not bookings:
        return turn.say('هنوز رزروی به نام این شماره ثبت نشده است.', [[btn('بازگشت به منو', 'm')]])
    lines, rows = ['رزروهای شما:', ''], []
    for i, b in enumerate(bookings, start=1):
        state = STATUS_LABELS.get(b.status, b.status)
        paid = 'پرداخت شده' if b.is_paid else 'پرداخت نشده'
        lines += [
            f'{fa(i)}) {b.caravan.name}',
            f'   حرکت {fa(b.caravan.departure_date)} · {fa(b.passenger_count)} نفر · {state} · {paid}',
            '',
        ]
        rows.append([btn(f'{fa(i)}) {b.booking_code or b.id}', f'r:{b.id}')])
    rows.append([btn('بازگشت به منو', 'm')])
    turn.say('\n'.join(lines), rows)


def cb_booking(turn, raw_id):
    if not turn.chat.user_id:
        return cb_my(turn, '')
    booking = (Booking.objects.select_related('caravan', 'caravan__leader')
               .filter(pk=raw_id if raw_id.isdigit() else 0, user=turn.chat.user, is_completed=True).first())
    if booking is None:
        return turn.toast('این رزرو پیدا نشد.')
    rows = []
    if booking.payment_link and not booking.is_paid and booking.status != 'cancelled':
        rows.append([{'text': '💳 پرداخت آنلاین', 'url': booking.payment_link}])
    rows.append([btn('بازگشت به رزروها', 'my'), btn('منو', 'm')])
    turn.say(receipt_text(booking), rows)


TEXT_HANDLERS = {
    'contact': text_contact, 'otp': text_otp,
    'first_name': text_first_name, 'last_name': text_last_name, 'national_id': text_national_id,
    'count': text_count,
    'c_first': text_c_first, 'c_last': text_c_last, 'c_nid': text_c_nid, 'c_phone': text_c_phone,
    'special': text_special,
}

CALLBACKS = {
    'm': cb_menu, 'd': cb_destination, 'c': cb_caravan, 'ld': cb_leader_guide,
    'b': cb_book, 'same': cb_same, 'n': cb_count, 'bc': cb_boarding, 'skip': cb_skip,
    's': cb_seat, 'sp': cb_seat_page, 'no': cb_seat_taken, 'sok': cb_seats_done,
    'ok': cb_confirm, 'x': cb_cancel_form,
    'my': cb_my, 'r': cb_booking, 'out': cb_logout,
}
