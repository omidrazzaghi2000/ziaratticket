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
    file_id = _image_file_id(message)
    if file_id and turn.chat.state in MEDIA_HANDLERS:
        return MEDIA_HANDLERS[turn.chat.state](turn, file_id)

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
    if leader_for(turn):
        rows.insert(0, [btn('📒 دفتر کاروان‌های من', 'L'), btn('➕ ثبت کاروان جدید', 'K')])
    else:
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


# ─── دفتر کاروان برای مدیر ───────────────────────────────────────────────────
#
# مدیری که چتش را با «کد اتصال» داشبورد وصل کرده، همان دفتر صفحه‌ی سایت را
# اینجا دارد: جمع‌ها، فهرست نفرات، افزودن زائر، ثبت قسط، مبدأ و توضیح. هویت
# مدیر از همان اتصال می‌آید (User.bale_chat_id)، نه از ورود زائر در همین چت؛
# و هر دکمه دوباره بررسی می‌کند که کاروان یا ردیف واقعاً مال همین مدیر باشد.

from . import ledger as ledger_service  # noqa: E402
from .models import LedgerRow  # noqa: E402

LEDGER_PAGE = 12
ORIGIN_LABELS = dict(LedgerRow.ORIGIN_CHOICES)


def leader_for(turn):
    from accounts.models import User
    return User.objects.filter(
        bale_chat_id=turn.chat.chat_id, role='caravan_leader', is_leader_approved=True,
    ).first()


def _leader_or_toast(turn):
    leader = leader_for(turn)
    if leader is None:
        turn.toast('این بخش فقط برای مدیر کاروانی است که حسابش را به ربات وصل کرده.')
    return leader


def _leader_caravan(turn, raw_id):
    leader = _leader_or_toast(turn)
    if leader is None:
        return None
    caravan = Caravan.objects.filter(pk=int(raw_id) if str(raw_id).isdigit() else 0, leader=leader).first()
    if caravan is None:
        turn.toast('این کاروان پیدا نشد.')
    return caravan


def _leader_row(turn, raw_id):
    leader = _leader_or_toast(turn)
    if leader is None:
        return None
    row = LedgerRow.objects.select_related('caravan', 'booking').filter(
        pk=int(raw_id) if str(raw_id).isdigit() else 0, caravan__leader=leader).first()
    if row is None:
        turn.toast('این ردیف پیدا نشد.')
    return row


def cb_leader_caravans(turn, arg):
    turn.reset()
    leader = _leader_or_toast(turn)
    if leader is None:
        return
    caravans = list(Caravan.objects.filter(leader=leader).exclude(status='rejected'))
    if not caravans:
        return turn.edit('هنوز کاروانی به نام شما ثبت نشده است.',
                         [[btn('➕ ثبت کاروان جدید', 'K')], [btn('منو', 'm')]])
    now = timezone.now()
    far = timezone.localdate() + timedelta(days=36500)
    # کاروان‌های پیش رو اول، نزدیک‌ترین حرکت اول؛ رفته‌ها آخر
    caravans.sort(key=lambda c: (c.has_departed(now), c.departure_day or far, c.id))
    rows = [[btn(('⏳ ' if c.status == 'pending' else '') + f'{c.name[:34]} · {fa(c.departure_date)}',
                 f'Lc:{c.id}:0')] for c in caravans[:20]]
    rows.append([btn('➕ ثبت کاروان جدید', 'K'), btn('منو', 'm')])
    turn.edit('دفتر کدام کاروان را می‌خواهید؟', rows)


def ledger_text(caravan, rows, page):
    t = ledger_service.totals(rows)
    active = [r for r in rows if not r.is_cancelled]
    lines = [
        f'📒 دفتر «{caravan.name}»',
        f'حرکت {fa(caravan.departure_date)} · ظرفیت باقیمانده {fa(caravan.remaining_capacity)} از {fa(caravan.capacity)}',
        '',
        f'نفرات: {fa(t["count"])}',
        f'جمع هزینه: {money(t["cost"])}',
        f'پرداخت‌شده: {money(t["paid"])}',
        f'الباقی: {money(t["remaining"])}',
    ]
    chunk = active[page * LEDGER_PAGE:(page + 1) * LEDGER_PAGE]
    if chunk:
        lines.append('')
    for i, r in enumerate(chunk, start=page * LEDGER_PAGE + 1):
        where = ORIGIN_LABELS.get(r.origin, '')
        head = ' · '.join(x for x in (r.full_name, fa(r.phone) if r.phone else '', where) if x)
        rest = 'تسویه ✓' if r.remaining == 0 else (
            f'الباقی {money(r.remaining)}' if r.remaining > 0 else f'اضافه پرداخت {money(-r.remaining)}')
        lines += [f'{fa(i)}) {head}', f'   پرداخت {fa(f"{int(r.paid):,}")} از {fa(f"{int(r.cost):,}")} · {rest}']
    if not active:
        lines += ['', 'هنوز کسی در این کاروان نیست.']
    return '\n'.join(lines), active


def show_ledger(turn, caravan, page=0, edit=True):
    rows = ledger_service.rows_for(caravan)
    active = [r for r in rows if not r.is_cancelled]
    pages = max(1, -(-len(active) // LEDGER_PAGE))
    page = min(max(page, 0), pages - 1)
    text, active = ledger_text(caravan, rows, page)
    chunk = active[page * LEDGER_PAGE:(page + 1) * LEDGER_PAGE]
    buttons = [btn(f'{fa(i)}) {r.full_name[:22]}', f'Lr:{r.id}')
               for i, r in enumerate(chunk, start=page * LEDGER_PAGE + 1)]
    kb = [[btn('➕ افزودن زائر', f'La:{caravan.id}'), btn('⚙️ تنظیمات کاروان', f'Ks:{caravan.id}')]]
    kb += [buttons[i:i + 2] for i in range(0, len(buttons), 2)]
    if pages > 1:
        nav = []
        if page > 0:
            nav.append(btn('◀️ قبلی', f'Lc:{caravan.id}:{page - 1}'))
        nav.append(btn(f'صفحه {fa(page + 1)} از {fa(pages)}', f'Lc:{caravan.id}:{page}'))
        if page < pages - 1:
            nav.append(btn('بعدی ▶️', f'Lc:{caravan.id}:{page + 1}'))
        kb.append(nav)
    kb.append([btn('کاروان‌های من', 'L'), btn('منو', 'm')])
    (turn.edit if edit else turn.say)(text, kb)


def cb_ledger(turn, arg):
    turn.reset()
    raw_id, _, raw_page = arg.partition(':')
    caravan = _leader_caravan(turn, raw_id)
    if caravan is None:
        return
    show_ledger(turn, caravan, int(raw_page) if raw_page.isdigit() else 0)


def row_text(r):
    source = 'ثبت دستی' if r.is_manual else f'رزرو {r.booking.booking_code if r.booking else ""} ' + (
        '(بله)' if r.booking and r.booking.source == 'bale' else '(سایت)')
    remaining = 'تسویه ✓' if r.remaining == 0 else (
        money(r.remaining) if r.remaining > 0 else f'{money(-r.remaining)} اضافه پرداخت')
    return '\n'.join([
        f'👤 {r.full_name}' + (' — لغو شده' if r.is_cancelled else ''),
        f'شماره تماس: {fa(r.phone) if r.phone else "—"}',
        f'مبدأ: {ORIGIN_LABELS.get(r.origin, "—")}',
        '',
        f'هزینه کاروان: {money(r.cost)}',
        f'پرداخت‌شده: {money(r.paid)}',
        f'الباقی: {remaining}',
        '',
        f'توضیحات: {r.notes or "—"}',
        f'منبع: {source}',
    ])


def show_row(turn, r, edit=True):
    kb = []
    if not r.is_cancelled:
        kb.append([btn('💰 ثبت پرداخت', f'Lpay:{r.id}'), btn('📝 توضیحات', f'Lnote:{r.id}')])
        kb.append([btn('🧭 تغییر مبدأ', f'Lorg:{r.id}'), btn('✏️ هزینه', f'Lcst:{r.id}')])
        if r.is_manual:
            kb.append([btn('🗑 حذف این نفر', f'Ldel:{r.id}')])
    kb.append([btn('بازگشت به دفتر', f'Lc:{r.caravan_id}:0')])
    (turn.edit if edit else turn.say)(row_text(r), kb)


def cb_row(turn, raw_id):
    turn.reset()
    r = _leader_row(turn, raw_id)
    if r:
        show_row(turn, r)


def _row_prompt(turn, raw_id, state, prompt, kb=None):
    turn.reset()
    r = _leader_row(turn, raw_id)
    if r is None or r.is_cancelled:
        return
    turn.data['row'] = r.id
    turn.go(state)
    turn.say(prompt.format(name=r.full_name), (kb or []) + [[btn('❌ انصراف', f'Lr:{r.id}')]])


def cb_pay(turn, raw_id):
    _row_prompt(turn, raw_id, 'L_pay', 'مبلغی که «{name}» تازه پرداخت کرده را به تومان بفرستید.\nبه پرداختی قبلی اضافه می‌شود.')


def cb_note(turn, raw_id):
    _row_prompt(turn, raw_id, 'L_note', 'توضیحات تازه‌ی «{name}» را بفرستید (جای قبلی را می‌گیرد).')


def cb_row_cost(turn, raw_id):
    _row_prompt(turn, raw_id, 'L_rcost', 'هزینه‌ی کاروان برای «{name}» را به تومان بفرستید.')


def _current_row(turn):
    leader = leader_for(turn)
    row = LedgerRow.objects.select_related('caravan', 'booking').filter(
        pk=turn.data.get('row'), caravan__leader=leader).first() if leader else None
    if row is None:
        turn.reset()
        turn.say('این ردیف دیگر در دسترس نیست.', [[btn('منو', 'm')]])
    return row


def text_pay(turn, text):
    r = _current_row(turn)
    if r is None:
        return
    try:
        ledger_service.record_payment(r, text)
    except ledger_service.LedgerError as exc:
        return turn.say(exc.message + ' دوباره بفرستید:')
    turn.reset()
    turn.say(f'✅ {money(ledger_service.parse_amount(text))} برای «{r.full_name}» ثبت شد.')
    show_row(turn, r, edit=False)


def text_note(turn, text):
    r = _current_row(turn)
    if r is None:
        return
    ledger_service.update_row(r, {'notes': text[:1000]})
    turn.reset()
    show_row(turn, r, edit=False)


def text_row_cost(turn, text):
    r = _current_row(turn)
    if r is None:
        return
    try:
        ledger_service.update_row(r, {'cost': text})
    except ledger_service.LedgerError as exc:
        return turn.say(exc.message + ' دوباره بفرستید:')
    turn.reset()
    show_row(turn, r, edit=False)


def cb_row_origin(turn, raw_id):
    r = _leader_row(turn, raw_id)
    if r is None or r.is_cancelled:
        return
    kb = [[btn(label, f'Lo2:{r.id}:{key}') for key, label in LedgerRow.ORIGIN_CHOICES[:2]],
          [btn(label, f'Lo2:{r.id}:{key}') for key, label in LedgerRow.ORIGIN_CHOICES[2:]],
          [btn('بازگشت', f'Lr:{r.id}')]]
    turn.edit(f'مبدأ «{r.full_name}»؟', kb)


def cb_row_origin_set(turn, arg):
    raw_id, _, key = arg.partition(':')
    r = _leader_row(turn, raw_id)
    if r is None or r.is_cancelled:
        return
    try:
        ledger_service.update_row(r, {'origin': key})
    except ledger_service.LedgerError as exc:
        return turn.toast(exc.message)
    turn.toast(f'مبدأ: {ORIGIN_LABELS.get(key)}')
    show_row(turn, r)


def cb_delete(turn, raw_id):
    r = _leader_row(turn, raw_id)
    if r is None:
        return
    if not r.is_manual:
        return turn.toast('این نفر از رزرو آمده؛ برای حذف، رزرو را از داشبورد لغو کنید.')
    turn.edit(f'«{r.full_name}» از دفتر حذف شود؟ یک نفر به ظرفیت کاروان برمی‌گردد.',
              [[btn('بله، حذف کن', f'Ldx:{r.id}'), btn('نه', f'Lr:{r.id}')]])


def cb_delete_yes(turn, raw_id):
    r = _leader_row(turn, raw_id)
    if r is None:
        return
    caravan = r.caravan
    try:
        ledger_service.delete_manual_row(r)
    except ledger_service.LedgerError as exc:
        return turn.toast(exc.message)
    caravan.refresh_from_db()
    turn.toast('حذف شد.')
    show_ledger(turn, caravan)


# ── افزودن زائر: نام → تماس → مبدأ → هزینه → پرداختی → توضیح ──

def cb_add(turn, raw_id, keep=False):
    caravan = _leader_caravan(turn, raw_id)
    if caravan is None:
        return
    if (caravan.remaining_capacity or 0) <= 0:
        return turn.say('ظرفیت این کاروان تکمیل است. اول ظرفیت را در سایت بیشتر کنید.',
                        [[btn('بازگشت به دفتر', f'Lc:{caravan.id}:0')]])
    kept = {k: turn.data.get(k) for k in ('origin', 'cost')} if keep else {}
    turn.reset()
    turn.chat.data = {'add': caravan.id, **{k: v for k, v in kept.items() if v is not None}}
    turn.go('L_name')
    turn.say(f'➕ افزودن زائر به «{caravan.name}»\nنام و نام خانوادگی:',
             [[btn('❌ انصراف', f'Lc:{caravan.id}:0')]])


def cb_add_next(turn, raw_id):
    """نفر بعدی با همان مبدأ و هزینه — فقط نام، تماس، پرداختی."""
    cb_add(turn, raw_id, keep=True)


def _adding(turn):
    leader = leader_for(turn)
    caravan = Caravan.objects.filter(pk=turn.data.get('add'), leader=leader).first() if leader else None
    if caravan is None:
        turn.reset()
        turn.say('این کاروان دیگر در دسترس نیست.', [[btn('منو', 'm')]])
    return caravan


def text_add_name(turn, text):
    if _adding(turn) is None:
        return
    name = ' '.join(text.split())
    if len(name) < 2:
        return turn.say('نام و نام خانوادگی را بنویسید:')
    turn.data['full_name'] = name[:120]
    turn.go('L_phone')
    turn.say('شماره تماس:', [[btn('ندارد', 'Lskip')]])


def text_add_phone(turn, text):
    digits = ''.join(ch for ch in to_latin_digits(text) if ch.isdigit())
    if not digits or len(digits) > 15:
        return turn.say('شماره فقط عدد است. دوباره بفرستید یا «ندارد» را بزنید:', [[btn('ندارد', 'Lskip')]])
    turn.data['phone'] = digits
    _after_phone(turn)


def _after_phone(turn):
    caravan = _adding(turn)
    if caravan is None:
        return
    if turn.data.get('origin') is not None and turn.data.get('cost') is not None:
        return _ask_paid(turn)                       # «نفر بعدی»: مبدأ و هزینه از قبل
    turn.go('L_origin')
    kb = [[btn(label, f'Lao:{key}') for key, label in LedgerRow.ORIGIN_CHOICES[:2]],
          [btn(label, f'Lao:{key}') for key, label in LedgerRow.ORIGIN_CHOICES[2:]],
          [btn('مشخص نیست', 'Lao:')]]
    turn.say('مبدأ:', kb)


def cb_add_origin(turn, key):
    if turn.chat.state != 'L_origin' or _adding(turn) is None:
        return turn.toast('این دکمه دیگر فعال نیست.')
    turn.data['origin'] = key if key in ORIGIN_LABELS else ''
    caravan = _adding(turn)
    turn.go('L_cost')
    turn.say('هزینه‌ی کاروان برای این نفر (به تومان):',
             [[btn(f'همان قیمت کاروان: {fa(f"{caravan.price:,}")}', 'Lcd')]])


def cb_add_cost_default(turn, arg):
    caravan = _adding(turn) if turn.chat.state == 'L_cost' else None
    if caravan is None:
        return turn.toast('این دکمه دیگر فعال نیست.')
    turn.data['cost'] = caravan.price
    _ask_paid(turn)


def text_add_cost(turn, text):
    try:
        turn.data['cost'] = ledger_service.parse_amount(text, 'هزینه')
    except ledger_service.LedgerError as exc:
        return turn.say(exc.message + ' دوباره بفرستید:')
    _ask_paid(turn)


def _ask_paid(turn):
    turn.go('L_paid')
    turn.say('چقدر پرداخت کرده؟ (به تومان)', [[btn('هنوز چیزی نداده', 'Lp0')]])


def cb_add_paid_zero(turn, arg):
    if turn.chat.state != 'L_paid':
        return turn.toast('این دکمه دیگر فعال نیست.')
    turn.data['paid'] = 0
    _ask_notes(turn)


def text_add_paid(turn, text):
    try:
        turn.data['paid'] = ledger_service.parse_amount(text, 'مبلغ پرداخت‌شده')
    except ledger_service.LedgerError as exc:
        return turn.say(exc.message + ' دوباره بفرستید:')
    _ask_notes(turn)


def _ask_notes(turn):
    turn.go('L_notes')
    turn.say('توضیحات:', [[btn('ندارد — ثبت کن', 'Lskip')]])


def text_add_notes(turn, text):
    turn.data['notes'] = text[:1000]
    _save_added(turn)


def cb_leader_skip(turn, arg):
    state = turn.chat.state
    if state == 'L_phone':
        turn.data['phone'] = ''
        return _after_phone(turn)
    if state == 'L_notes':
        turn.data['notes'] = ''
        return _save_added(turn)
    turn.toast('این دکمه دیگر فعال نیست.')


def _save_added(turn):
    caravan = _adding(turn)
    if caravan is None:
        return
    d = turn.data
    try:
        row = ledger_service.add_manual_row(
            caravan, full_name=d.get('full_name'), phone=d.get('phone', ''), origin=d.get('origin', ''),
            cost=d.get('cost'), paid=d.get('paid', 0), notes=d.get('notes', ''),
        )
    except ledger_service.LedgerError as exc:
        turn.reset()
        return turn.say(f'اضافه نشد: {exc.message}', [[btn('بازگشت به دفتر', f'Lc:{caravan.id}:0')]])
    keep = {'origin': row.origin, 'cost': int(row.cost)}
    turn.reset()
    turn.chat.data.update(keep)     # برای «نفر بعدی»
    turn.say(
        f'✅ «{row.full_name}» اضافه شد — ظرفیت باقیمانده {fa(caravan.remaining_capacity)} نفر.\n'
        f'هزینه {money(row.cost)} · پرداخت {money(row.paid)} · الباقی {money(max(row.remaining, 0))}',
        [[btn('➕ نفر بعدی (همان مبدأ و هزینه)', f'Ln:{caravan.id}')],
         [btn('📒 دیدن دفتر', f'Lc:{caravan.id}:0')]],
    )


TEXT_STATES |= {'L_name', 'L_phone', 'L_cost', 'L_paid', 'L_notes', 'L_pay', 'L_note', 'L_rcost'}
TEXT_HANDLERS.update({
    'L_name': text_add_name, 'L_phone': text_add_phone, 'L_cost': text_add_cost,
    'L_paid': text_add_paid, 'L_notes': text_add_notes,
    'L_pay': text_pay, 'L_note': text_note, 'L_rcost': text_row_cost,
})
CALLBACKS.update({
    'L': cb_leader_caravans, 'Lc': cb_ledger, 'Lr': cb_row,
    'Lpay': cb_pay, 'Lnote': cb_note, 'Lcst': cb_row_cost,
    'Lorg': cb_row_origin, 'Lo2': cb_row_origin_set, 'Ldel': cb_delete, 'Ldx': cb_delete_yes,
    'La': cb_add, 'Ln': cb_add_next, 'Lao': cb_add_origin, 'Lcd': cb_add_cost_default,
    'Lp0': cb_add_paid_zero, 'Lskip': cb_leader_skip,
})


# ─── ثبت کاروان تازه و تنظیمات کاروان، برای مدیر ─────────────────────────────
#
# همان مدیر وصل‌شده‌ی بخش دفتر، از بله کاروان تازه می‌سازد: یا از اول با چند
# سؤال ضروری، یا «کپی از کاروان قبلی» که فقط تاریخ، ظرفیت و قیمت را می‌پرسد.
# ساخت آخر کار از همان CaravanCreateSerializer سایت رد می‌شود و مثل سایت با
# وضعیت «در انتظار تأیید» ذخیره می‌شود. جزئیات (برنامه‌ی سفر، قوانین، گالری)
# در داشبورد سایت می‌ماند.
#
# تنظیمات کاروان موجود: باز/بستن ثبت‌نام و ظرفیت فوری اعمال می‌شوند؛ قیمت،
# تاریخ حرکت و مدت سفر چیزی است که زائر بر اساسش رزرو می‌کند، پس مثل ویرایش در
# سایت کاروان را به «در انتظار تأیید» برمی‌گرداند.

import io  # noqa: E402

from django.conf import settings as django_settings  # noqa: E402
from django.core.files.base import ContentFile  # noqa: E402

from carvans.serializers import CaravanCreateSerializer  # noqa: E402
from core.jalali import gregorian_to_jalali, parse_jalali_date  # noqa: E402

DEST_LABELS = dict(Caravan.DESTINATION_CHOICES)
TRANSPORT_LABELS = dict(Caravan.TRANSPORT_CHOICES)
BUS_LABELS = dict(Caravan.BUS_TYPE_CHOICES)
TRAIN_LABELS = dict(Caravan.TRAIN_TYPE_CHOICES)
ACC_LABELS = dict(Caravan.ACCOMMODATION_CHOICES)
APPROVAL_LABELS = {'pending': '⏳ در انتظار تأیید', 'approved': '✅ تأییدشده', 'rejected': '⛔️ ردشده'}
REG_LABELS = {'open': '🟢 ثبت‌نام باز', 'soon': '🟡 ثبت‌نام به‌زودی', 'closed': '🔴 ثبت‌نام بسته'}
MEALS = [('meal_breakfast', 'صبحانه'), ('meal_lunch', 'ناهار'), ('meal_dinner', 'شام'), ('has_insurance', 'بیمه')]
MAX_PRICE = 2_000_000_000
MAX_CAPACITY = 2000

NEW_STEPS = ['name', 'destination', 'date', 'duration', 'transport', 'vehicle', 'origin',
             'price', 'capacity', 'acc_type', 'acc_name', 'meals', 'photo']
COPY_STEPS = ['date', 'capacity', 'price']

# فیلدهایی که «کپی از کاروان قبلی» برمی‌دارد؛ تاریخ‌ها، ظرفیت باقیمانده، وضعیت و
# گالری نه (گالری فایل‌هایش را موقع حذف پاک می‌کند و نباید بین دو کاروان مشترک شود)
COPY_FIELDS = (
    'name', 'destination', 'description', 'contact_phone', 'leader_messaging_apps',
    'duration', 'transportation_type', 'bus_type', 'train_type', 'seat_selection_enabled',
    'origin_city', 'transit_cities', 'accommodation_type', 'accommodation_name',
    'accommodation_city', 'accommodation_distance', 'meal_breakfast', 'meal_lunch',
    'meal_dinner', 'has_insurance', 'itinerary', 'price', 'price_text', 'capacity', 'rules',
    'image_url',
)


def _image_file_id(message):
    """عکسی که فرستاده شده (یا فایل تصویری): شناسه‌ی بزرگ‌ترین اندازه."""
    photos = message.get('photo')
    if isinstance(photos, list) and photos and isinstance(photos[-1], dict):
        return photos[-1].get('file_id')
    doc = message.get('document')
    if isinstance(doc, dict) and str(doc.get('mime_type') or '').startswith('image/'):
        return doc.get('file_id')
    return None


def jalali_text(day):
    jy, jm, jd = gregorian_to_jalali(day)
    return f'{jy:04d}/{jm:02d}/{jd:02d}'


def _future_date(text):
    """تاریخ شمسی که امروز یا بعد از آن باشد → «1405/09/04»؛ وگرنه پیام خطا."""
    day = parse_jalali_date(text)
    if day is None:
        return None, 'تاریخ را به شکل ۱۴۰۵/۰۹/۰۴ بفرستید:'
    if day < timezone.localdate():
        return None, 'این تاریخ گذشته است. تاریخ حرکت را دوباره بفرستید:'
    return jalali_text(day), ''


def _int(text, low, high):
    digits = to_latin_digits(str(text)).replace(',', '').replace('٬', '').strip()
    if not digits.isdigit():
        return None
    value = int(digits)
    return value if low <= value <= high else None


def _price(text):
    try:
        value = ledger_service.parse_amount(text, 'قیمت')
    except ledger_service.LedgerError as exc:
        return None, exc.message
    if not 0 < value <= MAX_PRICE:
        return None, 'قیمت هر نفر باید عددی بیشتر از صفر (به تومان) باشد.'
    return value, ''


# ── شروع: از اول یا کپی ──

def cb_new_caravan(turn, arg):
    turn.reset()
    leader = _leader_or_toast(turn)
    if leader is None:
        return
    if Caravan.objects.filter(leader=leader).exclude(status='rejected').exists():
        return turn.edit('کاروان تازه را چطور بسازیم؟', [
            [btn('📋 کپی از یکی از کاروان‌های قبلی', 'Kcp')],
            [btn('🆕 از اول', 'Kn')],
            [btn('منو', 'm')],
        ])
    cb_new_blank(turn, '')


def cb_new_blank(turn, arg):
    turn.reset()
    if _leader_or_toast(turn) is None:
        return
    turn.chat.data = {'cv': {}, 'mode': 'new', 'done': []}
    turn.say('🆕 ثبت کاروان تازه — هر وقت خواستید «انصراف» را بفرستید.')
    _next(turn)


def cb_copy_list(turn, arg):
    turn.reset()
    leader = _leader_or_toast(turn)
    if leader is None:
        return
    caravans = Caravan.objects.filter(leader=leader).exclude(status='rejected').order_by('-created_at')[:15]
    rows = [[btn(f'{c.name[:34]} · {fa(c.departure_date)}', f'Kcf:{c.id}')] for c in caravans]
    rows.append([btn('🆕 از اول', 'Kn'), btn('منو', 'm')])
    turn.edit('از کدام کاروان کپی کنم؟ همه‌چیز برداشته می‌شود و فقط تاریخ حرکت، ظرفیت و قیمت پرسیده می‌شود.', rows)


def cb_copy_from(turn, raw_id):
    source = _leader_caravan(turn, raw_id)
    if source is None:
        return
    turn.reset()
    cv = {f: getattr(source, f) for f in COPY_FIELDS}
    if source.image:
        cv['image_from'] = source.id
    turn.chat.data = {'cv': cv, 'mode': 'copy', 'done': []}
    turn.say(f'📋 کپی از «{source.name}»')
    _next(turn)


# ── مرحله‌ها ──

def _cv(turn):
    return turn.data.setdefault('cv', {})


def _done(turn, step):
    done = turn.data.setdefault('done', [])
    if step not in done:
        done.append(step)
    if turn.data.get('redo') == step:
        turn.data.pop('redo')
    _next(turn)


def _next(turn):
    """اولین مرحله‌ی جواب‌داده‌نشده را می‌پرسد؛ همه که پر شد، خلاصه."""
    cv, done = _cv(turn), turn.data.get('done', [])
    steps = NEW_STEPS if turn.data.get('mode') == 'new' else COPY_STEPS
    pending = turn.data.get('redo') or next((s for s in steps if s not in done), None)
    if pending is None:
        return show_draft(turn)
    cancel = [btn('❌ انصراف', 'Kx')]

    if pending == 'name':
        turn.go('K_name')
        return turn.say('نام کاروان؟ (مثلاً «کاروان ۴ آذر کربلا»)', [cancel])
    if pending == 'destination':
        turn.go('K_dest')
        keys = list(DEST_LABELS)
        return turn.say('مقصد:', [[btn(DEST_LABELS[k], f'Kd:{k}') for k in keys[:2]],
                                  [btn(DEST_LABELS[k], f'Kd:{k}') for k in keys[2:]], cancel])
    if pending == 'date':
        turn.go('K_date')
        return turn.say('تاریخ حرکت (شمسی)، مثلاً ۱۴۰۵/۰۹/۰۴:', [cancel])
    if pending == 'duration':
        turn.go('K_dur')
        days = [btn(fa(n), f'Ku:{n}') for n in range(3, 10)]
        return turn.say('مدت سفر چند روز است؟', [days[:4], days[4:], cancel])
    if pending == 'transport':
        turn.go('K_trans')
        return turn.say('وسیله‌ی سفر:', [[btn(label, f'Kt:{k}') for k, label in Caravan.TRANSPORT_CHOICES[:2]],
                                          [btn(label, f'Kt:{k}') for k, label in Caravan.TRANSPORT_CHOICES[2:]],
                                          cancel])
    if pending == 'vehicle':
        kind = cv.get('transportation_type')
        if kind == 'bus':
            turn.go('K_bus')
            return turn.say('نوع اتوبوس:', [[btn(label, f'Kb:{k}')] for k, label in Caravan.BUS_TYPE_CHOICES] + [cancel])
        if kind == 'train':
            turn.go('K_train')
            return turn.say('نوع واگن قطار:', [[btn(label, f'Ktr:{k}') for k, label in Caravan.TRAIN_TYPE_CHOICES], cancel])
        return _done(turn, 'vehicle')
    if pending == 'origin':
        turn.go('K_origin')
        return turn.say('مبدأ حرکت؟ (شهر را بنویسید یا یکی را بزنید)',
                        [[btn('تهران', 'Ko:تهران'), btn('قم', 'Ko:قم'), btn('قم و تهران', 'Ko:قم و تهران')], cancel])
    if pending == 'price':
        turn.go('K_price')
        old = fa(f'{int(cv.get("price") or 0):,}')
        kb = [[btn(f'همان قبلی: {old}', 'Kkeep:price')]] if turn.data.get('mode') == 'copy' and cv.get('price') else []
        return turn.say('قیمت هر نفر به تومان (مثلاً ۴٬۵۰۰٬۰۰۰):', kb + [cancel])
    if pending == 'capacity':
        turn.go('K_cap')
        kb = [[btn(f'همان قبلی: {fa(cv.get("capacity"))} نفر', 'Kkeep:capacity')]] if turn.data.get('mode') == 'copy' and cv.get('capacity') else []
        return turn.say('ظرفیت کل کاروان (چند نفر)؟', kb + [cancel])
    if pending == 'acc_type':
        turn.go('K_acc')
        return turn.say('محل اقامت:', [[btn(label, f'Ka:{k}') for k, label in Caravan.ACCOMMODATION_CHOICES[:2]],
                                       [btn(label, f'Ka:{k}') for k, label in Caravan.ACCOMMODATION_CHOICES[2:]],
                                       cancel])
    if pending == 'acc_name':
        turn.go('K_accname')
        return turn.say('نام هتل یا اقامتگاه؟', [[btn('بعداً در سایت', 'Kskip')], cancel])
    if pending == 'meals':
        turn.go('K_meals')
        return turn.say(*_meals_prompt(cv))
    if pending == 'photo':
        turn.go('K_photo')
        return turn.say('یک عکس برای کاروان بفرستید (اختیاری؛ عکس‌های بیشتر را در سایت اضافه کنید).',
                        [[btn('بدون عکس', 'Kskip')], cancel])


def _meals_prompt(cv):
    marks = [btn(('✅ ' if cv.get(field) else '◻️ ') + label, f'Km:{field}') for field, label in MEALS]
    return ('چه چیزهایی در هزینه هست؟ روی هر کدام بزنید، بعد «ادامه».',
            [marks[:2], marks[2:], [btn('ادامه ◀️', 'Km:ok')], [btn('❌ انصراف', 'Kx')]])


def _at(turn, state):
    """دکمه‌ی پیام قدیمی‌تر، وقتی گفتگو جلوتر رفته، کاری نکند."""
    if turn.chat.state != state:
        turn.toast('این دکمه دیگر فعال نیست.')
        return False
    return True


def text_cv_name(turn, text):
    name = ' '.join(text.split())
    if not 3 <= len(name) <= 200:
        return turn.say('نام کاروان را بنویسید (دست‌کم ۳ حرف):')
    _cv(turn)['name'] = name
    _done(turn, 'name')


def cb_cv_dest(turn, key):
    if not _at(turn, 'K_dest') or key not in DEST_LABELS:
        return
    _cv(turn)['destination'] = key
    _done(turn, 'destination')


def text_cv_date(turn, text):
    value, error = _future_date(text)
    if value is None:
        return turn.say(error)
    _cv(turn)['departure_date'] = value
    _done(turn, 'date')


def cb_cv_duration(turn, arg):
    if not _at(turn, 'K_dur') or not arg.isdigit() or int(arg) not in range(3, 10):
        return
    _cv(turn)['duration'] = int(arg)
    _done(turn, 'duration')


def cb_cv_transport(turn, key):
    if not _at(turn, 'K_trans') or key not in TRANSPORT_LABELS:
        return
    cv = _cv(turn)
    cv['transportation_type'] = key
    if key != 'train':
        cv['train_type'] = ''
    _done(turn, 'transport')


def cb_cv_bus(turn, arg):
    if not _at(turn, 'K_bus') or not arg.isdigit() or int(arg) not in BUS_LABELS:
        return
    _cv(turn)['bus_type'] = int(arg)
    _done(turn, 'vehicle')


def cb_cv_train(turn, key):
    if not _at(turn, 'K_train') or key not in TRAIN_LABELS:
        return
    _cv(turn)['train_type'] = key
    _done(turn, 'vehicle')


def text_cv_origin(turn, text):
    city = ' '.join(text.split())
    if not 2 <= len(city) <= 100:
        return turn.say('نام شهر مبدأ را بنویسید:')
    _cv(turn)['origin_city'] = city
    _done(turn, 'origin')


def cb_cv_origin(turn, city):
    if not _at(turn, 'K_origin'):
        return
    text_cv_origin(turn, city)


def text_cv_price(turn, text):
    value, error = _price(text)
    if value is None:
        return turn.say(error + ' دوباره بفرستید:')
    cv = _cv(turn)
    if value != cv.get('price'):
        cv['price_text'] = ''        # متن قیمت قدیمی دیگر با عدد تازه جور نیست
    cv['price'] = value
    _done(turn, 'price')


def text_cv_capacity(turn, text):
    value = _int(text, 1, MAX_CAPACITY)
    if value is None:
        return turn.say('ظرفیت را به عدد بفرستید (مثلاً ۴۴):')
    _cv(turn)['capacity'] = value
    _done(turn, 'capacity')


def cb_cv_keep(turn, step):
    state = {'price': 'K_price', 'capacity': 'K_cap'}.get(step)
    if state is None or not _at(turn, state) or not _cv(turn).get(step):
        return
    _done(turn, step)


def cb_cv_acc(turn, key):
    if not _at(turn, 'K_acc') or key not in ACC_LABELS:
        return
    _cv(turn)['accommodation_type'] = key
    _done(turn, 'acc_type')


def text_cv_acc_name(turn, text):
    _cv(turn)['accommodation_name'] = ' '.join(text.split())[:200]
    _done(turn, 'acc_name')


def cb_cv_meal(turn, field):
    if not _at(turn, 'K_meals'):
        return
    cv = _cv(turn)
    if field == 'ok':
        return _done(turn, 'meals')
    if field in dict(MEALS):
        cv[field] = not cv.get(field)
        turn.edit(*_meals_prompt(cv))


def text_cv_photo(turn, text):
    turn.say('یک عکس بفرستید، یا «بدون عکس» را بزنید.', [[btn('بدون عکس', 'Kskip')]])


def media_cv_photo(turn, file_id):
    cv = _cv(turn)
    cv['photo'] = file_id
    cv.pop('image_from', None)
    turn.say('🖼 عکس دریافت شد.')
    _done(turn, 'photo')


def cb_cv_skip(turn, arg):
    state = turn.chat.state
    if state == 'K_accname':
        _cv(turn)['accommodation_name'] = ''
        return _done(turn, 'acc_name')
    if state == 'K_photo':
        _cv(turn).pop('photo', None)
        return _done(turn, 'photo')
    turn.toast('این دکمه دیگر فعال نیست.')


# ── خلاصه و ثبت ──

def draft_text(cv):
    vehicle = ''
    if cv.get('transportation_type') == 'bus' and cv.get('bus_type'):
        vehicle = f' ({BUS_LABELS.get(cv["bus_type"], "")})'
    elif cv.get('transportation_type') == 'train' and cv.get('train_type'):
        vehicle = f' ({TRAIN_LABELS.get(cv["train_type"], "")})'
    meals = '، '.join(label for field, label in MEALS if cv.get(field)) or '—'
    acc = ACC_LABELS.get(cv.get('accommodation_type'), '—')
    if cv.get('accommodation_name'):
        acc += f' — {cv["accommodation_name"]}'
    photo = 'دارد' if cv.get('photo') or cv.get('image_from') else 'ندارد'
    return '\n'.join([
        f'🕌 {cv.get("name", "")}',
        f'مقصد: {DEST_LABELS.get(cv.get("destination"), "—")}',
        f'حرکت: {fa(cv.get("departure_date", ""))} · {fa(cv.get("duration", ""))} روز',
        f'وسیله: {TRANSPORT_LABELS.get(cv.get("transportation_type"), "—")}{vehicle}',
        f'مبدأ: {cv.get("origin_city") or "—"}',
        f'قیمت هر نفر: {(cv.get("price_text") or "").strip() or money(cv.get("price"))}',
        f'ظرفیت: {fa(cv.get("capacity", ""))} نفر',
        f'اقامت: {acc}',
        f'شامل: {meals}',
        f'عکس: {photo}',
    ])


def show_draft(turn):
    turn.go('K_confirm')
    turn.say('خلاصه‌ی کاروان:\n\n' + draft_text(_cv(turn)) +
             '\n\nبعد از ثبت، کاروان تا تأیید ادمین «در انتظار تأیید» می‌ماند.', [
                 [btn('✅ ثبت کاروان', 'Kok')],
                 [btn('✏️ نام', 'Kre:name'), btn('📅 تاریخ', 'Kre:date'),
                  btn('💵 قیمت', 'Kre:price'), btn('👥 ظرفیت', 'Kre:capacity')],
                 [btn('❌ انصراف', 'Kx')],
             ])


def cb_cv_redo(turn, step):
    if not _at(turn, 'K_confirm') or step not in ('name', 'date', 'price', 'capacity'):
        return
    turn.data['redo'] = step
    _next(turn)


def _attach_photo(caravan, cv):
    """عکس فرستاده‌شده را دانلود و ذخیره می‌کند؛ عکس نامعتبر یا دانلودنشده نادیده."""
    if cv.get('image_from'):
        source = Caravan.objects.filter(pk=cv['image_from'], leader=caravan.leader).first()
        if source and source.image:
            caravan.image = source.image.name
            caravan.save(update_fields=['image'])
        return True
    if not cv.get('photo'):
        return True
    data = bale.download_file(cv['photo'])
    if not data:
        return False
    try:
        from PIL import Image
        Image.open(io.BytesIO(data)).verify()
    except Exception:
        return False
    caravan.image.save(f'bale_{caravan.id}_{random.randint(1000, 9999)}.jpg', ContentFile(data), save=True)
    return True


def cb_cv_confirm(turn, arg):
    if not _at(turn, 'K_confirm'):
        return
    leader = _leader_or_toast(turn)
    if leader is None:
        return
    cv = dict(_cv(turn))
    fields = {k: v for k, v in cv.items() if k in COPY_FIELDS or k == 'departure_date'}
    fields.setdefault('contact_phone', leader.phone or '')
    fields['registration_state'] = 'open'
    fields['remaining_capacity'] = fields.get('capacity')
    serializer = CaravanCreateSerializer(data=fields)
    if not serializer.is_valid():
        field, errors = next(iter(serializer.errors.items()))
        return turn.say(f'ثبت نشد: {errors[0] if errors else field}')
    caravan = serializer.save(
        leader=leader, manager=leader.full_name or leader.phone, status='pending',
        remaining_capacity=serializer.validated_data.get('capacity', 0),
    )
    photo_ok = _attach_photo(caravan, cv)
    turn.reset()
    lines = [
        f'✅ «{caravan.name}» ثبت شد و منتظر تأیید ادمین است.',
        'بعد از تأیید، در سایت و همین ربات برای زائرها نمایش داده می‌شود.',
        '',
        'برنامه‌ی سفر، قوانین و عکس‌های بیشتر را از داشبورد سایت اضافه کنید.',
    ]
    if not photo_ok:
        lines.insert(1, '⚠️ عکس دریافت نشد؛ از داشبورد سایت اضافه کنید.')
    turn.say('\n'.join(lines), [
        [btn('⚙️ تنظیمات کاروان', f'Ks:{caravan.id}'), btn('📒 دفتر', f'Lc:{caravan.id}:0')],
        [btn('منو', 'm')],
    ])
    support = getattr(django_settings, 'BALE_FALLBACK_CHAT_ID', '') or ''
    if support and str(support) != str(turn.chat.chat_id):
        turn.out.append(('sendMessage', {'chat_id': str(support), 'text': (
            f'🆕 کاروان تازه از ربات بله، منتظر تأیید:\n«{caravan.name}» · حرکت {fa(caravan.departure_date)}\n'
            f'مدیر: {caravan.manager} ({fa(leader.phone or "")})\nاز پنل ادمین تأیید کنید.')}))


def cb_cv_cancel(turn, arg):
    turn.reset()
    turn.edit('ثبت کاروان کنار گذاشته شد؛ چیزی ذخیره نشد.', [[btn('منو', 'm')]])


# ── تنظیمات کاروان موجود ──

def settings_text(c):
    booked = (c.capacity or 0) - (c.remaining_capacity or 0)
    lines = [
        f'⚙️ «{c.name}»',
        f'وضعیت: {APPROVAL_LABELS.get(c.status, c.status)}',
        f'{REG_LABELS.get(c.registration_status(), "")}',
        '',
        f'حرکت: {fa(c.departure_date)} · {fa(c.duration)} روز',
        f'قیمت هر نفر: {price_label(c)}',
        f'ظرفیت: {fa(c.capacity)} نفر · رزروشده {fa(booked)} · خالی {fa(c.remaining_capacity)}',
    ]
    if c.registration_opens_on:
        lines.append(f'باز شدن ثبت‌نام: {fa(c.registration_opens_on)}')
    if c.registration_closes_on:
        lines.append(f'پایان ثبت‌نام: {fa(c.registration_closes_on)}')
    return '\n'.join(lines)


def show_settings(turn, c, edit=True):
    kb = [
        [btn('🟢 باز', f'Kr:{c.id}:open'), btn('🟡 به‌زودی', f'Kr:{c.id}:soon'), btn('🔴 بسته', f'Kr:{c.id}:closed')],
        [btn('💵 قیمت', f'Kep:{c.id}'), btn('👥 ظرفیت', f'Kec:{c.id}')],
        [btn('📅 تاریخ حرکت', f'Ked:{c.id}'), btn('⏱ مدت سفر', f'Keu:{c.id}')],
        [btn('📒 دفتر', f'Lc:{c.id}:0'), btn('کاروان‌های من', 'L')],
    ]
    (turn.edit if edit else turn.say)(settings_text(c), kb)


def cb_settings(turn, raw_id):
    turn.reset()
    c = _leader_caravan(turn, raw_id)
    if c:
        show_settings(turn, c)


def cb_registration(turn, arg):
    raw_id, _, state = arg.partition(':')
    c = _leader_caravan(turn, raw_id)
    if c is None or state not in REG_LABELS:
        return
    now = timezone.now()
    fields = ['registration_state']
    c.registration_state = state
    if state in ('open', 'soon') and c.registration_opens_at and c.registration_opens_at > now:
        # دکمه باید همان کاری را بکند که رویش نوشته؛ تاریخ بازشدن آینده جلویش را می‌گرفت
        c.registration_opens_on, c.registration_opens_time = '', None
        fields += ['registration_opens_on', 'registration_opens_time']
    if state == 'open' and c.registration_closes_at and c.registration_closes_at <= now:
        c.registration_closes_on, c.registration_closes_time = '', None
        fields += ['registration_closes_on', 'registration_closes_time']
    c.save(update_fields=fields + ['updated_at'])
    actual = c.registration_status(now)
    turn.toast(REG_LABELS[actual] if actual == state else f'{REG_LABELS[actual]} — به خاطر تاریخ‌های کاروان.')
    show_settings(turn, c)


REVIEW_NOTE = '\n⚠️ تغییر این مورد کاروان را تا تأیید دوباره‌ی ادمین از سایت برمی‌دارد.'


def _edit_prompt(turn, raw_id, state, prompt):
    turn.reset()
    c = _leader_caravan(turn, raw_id)
    if c is None:
        return
    turn.chat.data = {'edit': c.id}
    turn.go(state)
    turn.say(prompt.format(c=c, price=fa(f'{c.price:,}'), date=fa(c.departure_date), cap=fa(c.capacity)),
             [[btn('❌ انصراف', f'Ks:{c.id}')]])


def cb_edit_price(turn, raw_id):
    _edit_prompt(turn, raw_id, 'K_eprice', 'قیمت فعلی هر نفر {price} تومان است. قیمت تازه را به تومان بفرستید:' + REVIEW_NOTE)


def cb_edit_capacity(turn, raw_id):
    _edit_prompt(turn, raw_id, 'K_ecap', 'ظرفیت فعلی {cap} نفر است. ظرفیت کل تازه را بفرستید:')


def cb_edit_date(turn, raw_id):
    _edit_prompt(turn, raw_id, 'K_edate', 'تاریخ حرکت فعلی {date} است. تاریخ تازه را بفرستید (مثلاً ۱۴۰۵/۰۹/۰۴):' + REVIEW_NOTE)


def cb_edit_duration(turn, raw_id):
    c = _leader_caravan(turn, raw_id)
    if c is None:
        return
    days = [btn(('✓ ' if n == c.duration else '') + fa(n), f'Keu2:{c.id}:{n}') for n in range(3, 10)]
    turn.edit(f'مدت سفر «{c.name}» چند روز است؟' + REVIEW_NOTE, [days[:4], days[4:], [btn('بازگشت', f'Ks:{c.id}')]])


def _editing(turn):
    leader = leader_for(turn)
    c = Caravan.objects.select_for_update().filter(pk=turn.data.get('edit'), leader=leader).first() if leader else None
    if c is None:
        turn.reset()
        turn.say('این کاروان دیگر در دسترس نیست.', [[btn('منو', 'm')]])
    return c


def _save_reviewed(turn, c, fields):
    """تغییری که زائر بر اساسش رزرو می‌کند: مثل سایت دوباره منتظر تأیید."""
    was_approved = c.status == 'approved'
    c.status = 'pending'
    c.save(update_fields=fields + ['status', 'updated_at'])
    turn.reset()
    if was_approved:
        turn.say('ذخیره شد. کاروان تا تأیید دوباره‌ی ادمین از سایت برداشته شد.')
    show_settings(turn, c, edit=False)


def text_edit_price(turn, text):
    value, error = _price(text)
    if value is None:
        return turn.say(error + ' دوباره بفرستید:')
    c = _editing(turn)
    if c is None:
        return
    if value == c.price:
        turn.reset()
        return show_settings(turn, c, edit=False)
    c.price, c.price_text = value, ''
    _save_reviewed(turn, c, ['price', 'price_text'])


def text_edit_date(turn, text):
    value, error = _future_date(text)
    if value is None:
        return turn.say(error)
    c = _editing(turn)
    if c is None:
        return
    c.departure_date = value
    _save_reviewed(turn, c, ['departure_date'])


def cb_edit_duration_set(turn, arg):
    raw_id, _, n = arg.partition(':')
    c = _leader_caravan(turn, raw_id)
    if c is None or not n.isdigit() or int(n) not in range(3, 10):
        return
    if int(n) == c.duration:
        return show_settings(turn, c)
    c.duration = int(n)
    turn.chat.data = {'edit': c.id}
    _save_reviewed(turn, c, ['duration'])


def text_edit_capacity(turn, text):
    value = _int(text, 1, MAX_CAPACITY)
    if value is None:
        return turn.say('ظرفیت را به عدد بفرستید:')
    c = _editing(turn)
    if c is None:
        return
    booked = (c.capacity or 0) - (c.remaining_capacity or 0)
    if value < booked:
        return turn.say(f'ظرفیت نمی‌تواند کمتر از {fa(booked)} نفری باشد که الان در کاروان‌اند. عدد دیگری بفرستید:')
    c.capacity, c.remaining_capacity = value, value - booked
    c.save(update_fields=['capacity', 'remaining_capacity', 'updated_at'])
    turn.reset()
    turn.say(f'✅ ظرفیت {fa(value)} نفر شد · خالی {fa(c.remaining_capacity)}')
    show_settings(turn, c, edit=False)


MEDIA_HANDLERS = {'K_photo': media_cv_photo}
TEXT_STATES |= {'K_name', 'K_date', 'K_origin', 'K_price', 'K_cap', 'K_accname', 'K_photo',
                'K_eprice', 'K_ecap', 'K_edate'}
TEXT_HANDLERS.update({
    'K_name': text_cv_name, 'K_date': text_cv_date, 'K_origin': text_cv_origin,
    'K_price': text_cv_price, 'K_cap': text_cv_capacity, 'K_accname': text_cv_acc_name,
    'K_photo': text_cv_photo,
    'K_eprice': text_edit_price, 'K_ecap': text_edit_capacity, 'K_edate': text_edit_date,
})
CALLBACKS.update({
    'K': cb_new_caravan, 'Kn': cb_new_blank, 'Kcp': cb_copy_list, 'Kcf': cb_copy_from,
    'Kd': cb_cv_dest, 'Ku': cb_cv_duration, 'Kt': cb_cv_transport, 'Kb': cb_cv_bus,
    'Ktr': cb_cv_train, 'Ko': cb_cv_origin, 'Kkeep': cb_cv_keep, 'Ka': cb_cv_acc,
    'Km': cb_cv_meal, 'Kskip': cb_cv_skip, 'Kre': cb_cv_redo, 'Kok': cb_cv_confirm, 'Kx': cb_cv_cancel,
    'Ks': cb_settings, 'Kr': cb_registration, 'Kep': cb_edit_price, 'Kec': cb_edit_capacity,
    'Ked': cb_edit_date, 'Keu': cb_edit_duration, 'Keu2': cb_edit_duration_set,
})
