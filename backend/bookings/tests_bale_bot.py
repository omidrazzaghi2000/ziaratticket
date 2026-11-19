"""
گفتگوی ثبت‌نام زائر در ربات بله، از «/start» تا رسید.

بله‌ی واقعی در کار نیست: ``core.bale.call`` ضبط می‌شود و تست‌ها همان چیزی را
می‌بینند که زائر در گوشی‌اش می‌دید — متن پیام‌ها و دکمه‌ها.
"""
import json
from datetime import timedelta
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone

from bookings.models import BaleChat, Booking
from carvans.models import Caravan

User = get_user_model()
CHAT = 777


@override_settings(BALE_BOT_TOKEN='t', BALE_WEBHOOK_SECRET='hook')
class BotCase(TestCase):
    def setUp(self):
        self.sent = []          # (method, payload) به ترتیب
        self._uid = 0
        patcher = mock.patch('core.bale.call', side_effect=self._record)
        patcher.start()
        self.addCleanup(patcher.stop)
        sms = mock.patch('accounts.views._send_otp_sms', return_value=True)
        self.sms = sms.start()
        self.addCleanup(sms.stop)

        self.leader = User.objects.create_user(
            phone='09120000001', role='caravan_leader', is_leader_approved=True)
        self.caravan = self.make_caravan()

    def make_caravan(self, **kw):
        data = dict(
            name='کاروان نور', destination='karbala', status='approved', leader=self.leader,
            departure_date='1499/08/27', duration=5, transportation_type='bus', bus_type=25,
            accommodation_type='hotel', price=4_000_000, capacity=25, remaining_capacity=25,
            origin_city='قم و تهران', contact_phone='09120000001',
        )
        data.update(kw)
        return Caravan.objects.create(**data)

    # ── بله‌ی قلابی ──
    def _record(self, method, payload=None):
        self.sent.append((method, payload or {}))
        return {'message_id': len(self.sent)}

    def _post(self, update):
        self._uid += 1
        update.setdefault('update_id', self._uid)
        before = len(self.sent)
        r = self.client.post('/api/bale/webhook/hook', data=json.dumps(update), content_type='application/json')
        self.assertEqual(r.status_code, 200)
        self.new = self.sent[before:]
        return self.new

    def say(self, text, chat=CHAT, **extra):
        msg = {'message_id': 1, 'chat': {'id': chat, 'type': 'private'}, 'from': {'id': chat}, 'text': text}
        msg.update(extra)
        return self._post({'message': msg})

    def tap(self, data, chat=CHAT):
        return self._post({'callback_query': {
            'id': 'cb', 'from': {'id': chat}, 'data': data,
            'message': {'message_id': 5, 'chat': {'id': chat, 'type': 'private'}},
        }})

    def share(self, phone, owner=CHAT, chat=CHAT):
        contact = {'phone_number': phone, 'first_name': 'علی'}
        if owner is not None:
            contact['user_id'] = owner
        return self._post({'message': {
            'message_id': 2, 'chat': {'id': chat, 'type': 'private'}, 'from': {'id': chat}, 'contact': contact,
        }})

    # ── چیزی که زائر می‌بیند ──
    def messages(self):
        return [p for m, p in self.new if m in ('sendMessage', 'editMessageText')]

    def text(self):
        return '\n'.join(p['text'] for p in self.messages())

    def buttons(self):
        out = []
        for p in self.messages():
            for row in (p.get('reply_markup') or {}).get('inline_keyboard', []):
                out += [b.get('callback_data') or b.get('url') for b in row]
        return out

    def toast(self):
        return next((p.get('text', '') for m, p in self.new if m == 'answerCallbackQuery'), '')

    def chat(self):
        return BaleChat.objects.get(chat_id=str(CHAT))

    def login(self, phone='09123456789'):
        self.tap(f'b:{self.caravan.id}')
        self.share('98' + phone[1:])

    def fill_guardian(self, count=1):
        self.say('علی')
        self.say('رضایی')
        self.say('۰۰۱۲۳۴۵۶۷۸')
        self.tap(f'n:{count}')


class BrowseTests(BotCase):
    def test_start_shows_destinations_that_have_caravans(self):
        self.make_caravan(name='رفته', departure_date='1400/01/01', destination='mashhad')
        self.say('/start')
        self.assertIn('خوش آمدید', self.text())
        self.assertIn('d:karbala', self.buttons())
        self.assertNotIn('d:mashhad', self.buttons())   # تنها کاروان مشهد حرکت کرده

    def test_list_is_nearest_departure_first(self):
        self.make_caravan(name='زودتر', departure_date='1499/08/01')
        self.tap('d:karbala')
        text = self.text()
        self.assertLess(text.index('زودتر'), text.index('کاروان نور'))

    def test_details_use_the_leaders_price_wording(self):
        self.caravan.price_text = '۴ میلیون تومان + ۳۵ دینار'
        self.caravan.save()
        self.tap(f'c:{self.caravan.id}')
        self.assertIn('۴ میلیون تومان + ۳۵ دینار', self.text())
        self.assertIn('قم، تهران', self.text())
        self.assertIn(f'b:{self.caravan.id}', self.buttons())

    def test_no_register_button_before_registration_opens(self):
        soon = self.make_caravan(name='به‌زودی', registration_state='soon', registration_opens_on='1499/01/01')
        self.tap(f'c:{soon.id}')
        self.assertNotIn(f'b:{soon.id}', self.buttons())
        self.tap(f'b:{soon.id}')            # دکمه‌ی قدیمی یا دست‌کاری‌شده
        self.assertIn('هنوز باز نشده', self.text())
        self.assertEqual(self.chat().state, '')

    def test_group_chats_are_ignored(self):
        self._post({'message': {'chat': {'id': -5, 'type': 'group'}, 'from': {'id': 9}, 'text': '/start'}})
        self.assertEqual(self.new, [])


class IdentityTests(BotCase):
    def test_bale_verified_contact_links_at_once(self):
        self.tap(f'b:{self.caravan.id}')
        self.assertTrue(self.messages()[0]['reply_markup']['keyboard'][0][0]['request_contact'])
        self.share('989123456789')
        self.sms.assert_not_called()
        self.assertEqual(self.chat().user.phone, '09123456789')
        self.assertTrue(self.chat().user.is_verified)
        self.assertEqual(self.chat().state, 'first_name')    # فرم همان کاروان ادامه پیدا می‌کند

    def test_someone_elses_contact_needs_the_sms_code(self):
        victim = User.objects.create_user(phone='09125555555')
        self.tap(f'b:{self.caravan.id}')
        self.share('09125555555', owner=999)                 # کارت مخاطب کس دیگر
        self.assertIsNone(self.chat().user)
        phone, code = self.sms.call_args.args
        self.assertEqual(phone, '09125555555')
        self.say('00000' if code != '00000' else '11111')
        self.assertIsNone(self.chat().user)
        self.say(code)
        self.assertEqual(self.chat().user, victim)

    def test_contact_without_owner_id_is_not_trusted(self):
        self.tap(f'b:{self.caravan.id}')
        self.share('09125555555', owner=None)
        self.sms.assert_called_once()
        self.assertIsNone(self.chat().user)

    def test_code_guessing_is_cut_off(self):
        self.tap(f'b:{self.caravan.id}')
        self.share('09125555555', owner=None)
        code = self.sms.call_args.args[1]
        wrong = '00000' if code != '00000' else '11111'
        for _ in range(5):
            self.say(wrong)
        self.say(code)                                        # تلاش ششم، حتی با کد درست
        self.assertIsNone(self.chat().user)

    def test_foreign_number_is_refused(self):
        self.tap(f'b:{self.caravan.id}')
        self.share('+14155550100')
        self.assertIsNone(self.chat().user)
        self.assertIn('ایران', self.text())

    def test_logout_forgets_the_account(self):
        self.login()
        self.say('منو')
        self.assertIn('out', self.buttons())
        self.tap('out')
        self.assertIsNone(self.chat().user)


class BookingFlowTests(BotCase):
    def test_full_booking_with_companions_seats_and_request(self):
        self.caravan.seat_selection_enabled = True
        self.caravan.save()
        Booking.objects.create(      # صندلی ۳ از قبل گرفته شده
            user=self.leader, caravan=self.caravan, main_passenger_name='دیگری', passenger_count=1,
            total_price=1, transportation_type='bus', status='completed', is_completed=True, selected_seats=[3],
        )
        self.login()
        self.fill_guardian(count=3)
        self.assertIn('کدام شهر', self.text())
        self.tap('bc:1')                                      # تهران
        for first, last, nid in (('زهرا', 'رضایی', '0012345679'), ('حسین', 'رضایی', '0012345680')):
            self.say(first)
            self.say(last)
            self.say(nid)
            self.tap('skip')                                  # موبایل همراه اختیاری است
        self.assertEqual(self.chat().state, 'seats')
        self.assertIn('no', self.buttons())                   # صندلی ۳ قابل انتخاب نیست
        for seat in (5, 6):
            self.tap(f's:{seat}')
        self.tap('sok')
        self.assertIn('دقیقاً 3 صندلی', self.toast())         # دو تا از سه تا
        self.tap('s:7')
        self.tap('s:8')
        self.assertIn('بیشتر از ۳', self.toast())
        self.tap('sok')
        self.say('ویلچر لازم داریم')
        summary = self.text()
        for piece in ('علی رضایی', 'زهرا رضایی', 'حسین رضایی', 'تهران', '۵، ۶، ۷', 'ویلچر', '۱۲,۰۰۰,۰۰۰'):
            self.assertIn(piece, summary)
        self.assertEqual(Booking.objects.filter(source='bale').count(), 0)   # هنوز هیچ‌چیز ثبت نشده

        self.tap('ok')
        b = Booking.objects.get(source='bale')
        self.assertTrue(b.is_completed)
        self.assertEqual(b.status, 'completed')
        self.assertEqual((b.user.phone, b.main_passenger_phone), ('09123456789', '09123456789'))
        self.assertEqual((b.main_passenger_name, b.main_passenger_id), ('علی رضایی', '0012345678'))
        self.assertEqual(b.passenger_count, 3)
        self.assertEqual([c['nationalId'] for c in b.companions], ['0012345679', '0012345680'])
        self.assertEqual(sorted(b.selected_seats), [5, 6, 7])
        self.assertEqual(b.boarding_city, 'تهران')
        self.assertEqual(b.special_requests, 'ویلچر لازم داریم')
        self.assertEqual(b.total_price, 12_000_000)
        self.caravan.refresh_from_db()
        self.assertEqual(self.caravan.remaining_capacity, 22)
        self.assertIn(b.booking_code, self.text())
        self.assertIn('در انتظار پرداخت', self.text())
        self.assertEqual(self.chat().state, '')

    def test_leader_is_notified_once_the_booking_commits(self):
        self.login()
        self.fill_guardian()
        self.tap('bc:0')
        self.tap('skip')
        with mock.patch('bookings.services.notify_leader_of_booking') as notify, \
                self.captureOnCommitCallbacks(execute=True):
            self.tap('ok')
        notify.assert_called_once()
        self.assertEqual(notify.call_args.args[0].source, 'bale')

    def test_abandoned_form_leaves_no_trace(self):
        self.login()
        self.fill_guardian(count=2)
        self.say('انصراف')
        self.assertEqual(Booking.objects.count(), 0)
        self.caravan.refresh_from_db()
        self.assertEqual(self.caravan.remaining_capacity, 25)
        self.assertEqual((self.chat().state, self.chat().data), ('', {}))

    def test_bad_input_is_asked_again_not_stored(self):
        self.login()
        self.say('ع')                                         # خیلی کوتاه
        self.assertEqual(self.chat().state, 'first_name')
        self.say('علی')
        self.say('رضایی')
        self.say('12345')                                     # کد ملی ناقص
        self.assertEqual(self.chat().state, 'national_id')
        self.assertIn('۱۰ رقم', self.text())

    def test_companion_cannot_reuse_a_national_id(self):
        self.login()
        self.fill_guardian(count=2)
        self.tap('bc:0')
        self.say('زهرا')
        self.say('رضایی')
        self.say('0012345678')                                # همان کد ملی سرپرست
        self.assertEqual(self.chat().state, 'c_nid')
        self.assertIn('قبلاً', self.text())

    def test_single_origin_is_not_asked(self):
        self.caravan.origin_city = 'تهران'
        self.caravan.save()
        self.login()
        self.fill_guardian()
        self.assertEqual(self.chat().state, 'special')
        self.tap('skip')
        self.tap('ok')
        self.assertEqual(Booking.objects.get().boarding_city, 'تهران')

    def test_seat_lost_meanwhile_returns_to_the_seat_step_only(self):
        self.caravan.seat_selection_enabled = True
        self.caravan.save()
        self.login()
        self.fill_guardian()
        self.tap('bc:0')
        self.tap('s:9')
        self.tap('sok')
        self.tap('skip')
        Booking.objects.create(      # کس دیگری در همین فاصله صندلی ۹ را گرفت
            user=self.leader, caravan=self.caravan, main_passenger_name='سریع‌تر', passenger_count=1,
            total_price=1, transportation_type='bus', status='completed', is_completed=True, selected_seats=[9],
        )
        self.tap('ok')
        self.assertEqual(Booking.objects.filter(source='bale').count(), 0)
        chat = self.chat()
        self.assertEqual(chat.state, 'seats')
        self.assertEqual(chat.data['first_name'], 'علی')      # بقیه‌ی فرم سر جایش است
        self.tap('s:10')
        self.tap('sok')
        self.tap('skip')
        self.tap('ok')
        self.assertEqual(Booking.objects.get(source='bale').selected_seats, [10])

    def test_capacity_gone_at_the_last_moment(self):
        self.login()
        self.fill_guardian(count=2)
        self.tap('bc:0')
        self.say('زهرا')
        self.say('رضایی')
        self.say('0012345679')
        self.tap('skip')
        self.tap('skip')
        Caravan.objects.filter(pk=self.caravan.pk).update(remaining_capacity=1)
        self.tap('ok')
        self.assertEqual(Booking.objects.count(), 0)
        self.assertIn('ثبت نشد', self.text())

    def test_retried_confirm_does_not_book_twice(self):
        self.login()
        self.fill_guardian()
        self.tap('bc:0')
        self.tap('skip')
        update = {'update_id': 9000, 'callback_query': {
            'id': 'cb', 'from': {'id': CHAT}, 'data': 'ok',
            'message': {'message_id': 5, 'chat': {'id': CHAT, 'type': 'private'}},
        }}
        self._post(dict(update))
        self._post(dict(update))                               # بله همان آپدیت را دوباره فرستاد
        self.assertEqual(self.new, [])
        self.tap('ok')                                         # دوبار زدن دکمه
        self.assertEqual(Booking.objects.count(), 1)
        self.caravan.refresh_from_db()
        self.assertEqual(self.caravan.remaining_capacity, 24)

    def test_previous_details_can_be_reused(self):
        self.login()
        self.fill_guardian()
        self.tap('bc:0')
        self.tap('skip')
        self.tap('ok')
        self.tap(f'b:{self.caravan.id}')
        self.assertIn('same', self.buttons())
        self.tap('same')
        self.assertEqual(self.chat().state, 'count')
        self.assertEqual(self.chat().data['national_id'], '0012345678')

    def test_stale_form_expires(self):
        self.login()
        self.say('علی')
        BaleChat.objects.filter(chat_id=str(CHAT)).update(updated_at=timezone.now() - timedelta(hours=4))
        self.say('رضایی')                                      # جواب به فرمی که دیگر نیست
        self.assertEqual(self.chat().state, '')
        self.assertIn('d:karbala', self.buttons())


class MyBookingsTests(BotCase):
    def book(self):
        self.login()
        self.fill_guardian()
        self.tap('bc:0')
        self.tap('skip')
        self.tap('ok')
        return Booking.objects.get(source='bale')

    def test_lists_only_my_own_bookings(self):
        mine = self.book()
        other = Booking.objects.create(
            user=self.leader, caravan=self.caravan, main_passenger_name='غریبه', passenger_count=1,
            total_price=1, transportation_type='bus', status='completed', is_completed=True,
        )
        self.tap('my')
        self.assertIn(f'r:{mine.id}', self.buttons())
        self.assertNotIn(f'r:{other.id}', self.buttons())
        self.tap(f'r:{other.id}')                              # شناسه‌ی رزرو دیگران
        self.assertEqual(self.messages(), [])
        self.assertIn('پیدا نشد', self.toast())

    def test_payment_link_becomes_a_button(self):
        b = self.book()
        Booking.objects.filter(pk=b.pk).update(payment_link='https://pay.example/x')
        self.tap(f'r:{b.id}')
        self.assertIn('https://pay.example/x', self.buttons())
        self.assertIn('پرداخت آنلاین', self.text())

    def test_asks_for_the_number_first(self):
        self.tap('my')
        self.assertEqual(self.chat().state, 'contact')
        self.share('989123456789')
        self.assertIn('هنوز رزروی', self.text())


class LeaderCodeStillWorksTests(BotCase):
    def test_connect_code_links_the_leader(self):
        from core import bale_link
        code = bale_link.issue_connect_code(self.leader)
        with mock.patch('core.bale.send_message', return_value=True):
            self.say(code)
        self.leader.refresh_from_db()
        self.assertEqual(self.leader.bale_chat_id, str(CHAT))

    def test_text_inside_a_form_is_an_answer_not_a_code(self):
        from core import bale_link
        code = bale_link.issue_connect_code(self.leader)
        self.login()
        self.say('علی')
        self.say('رضایی')
        self.say('0012345678')
        self.tap('n:1')
        self.tap('bc:0')
        self.say(code)                                         # در مرحله‌ی «درخواست خاص»
        self.leader.refresh_from_db()
        self.assertEqual(self.leader.bale_chat_id, '')
        self.assertEqual(self.chat().data['special'], code)


class LeaderLedgerInBaleTests(BotCase):
    """مدیری که چتش وصل است، دفتر کاروانش را در بله دارد."""

    def setUp(self):
        super().setUp()
        User.objects.filter(pk=self.leader.pk).update(bale_chat_id=str(CHAT))

    def rows(self):
        from bookings.models import LedgerRow
        return LedgerRow.objects.filter(caravan=self.caravan).order_by('id')

    def add(self, name='حسن محمدی', phone='۰۹۱۲۳۳۳۴۴۵۵', origin='mehran', paid='۱٬۰۰۰٬۰۰۰', notes=None):
        self.tap(f'La:{self.caravan.id}')
        self.say(name)
        self.say(phone) if phone else self.tap('Lskip')
        self.tap(f'Lao:{origin}')
        self.tap('Lcd')
        self.say(paid) if paid else self.tap('Lp0')
        self.say(notes) if notes else self.tap('Lskip')

    def test_menu_shows_the_ledger_only_to_a_linked_leader(self):
        self.say('/start')
        self.assertIn('L', self.buttons())
        self.assertNotIn('ld', self.buttons())
        self.say('/start', chat=CHAT + 1)            # چت دیگری که وصل نیست
        self.assertNotIn('L', self.buttons())

    def test_add_a_pilgrim_step_by_step(self):
        self.add(notes='بیعانه نقد')
        row = self.rows().get()
        self.assertEqual((row.full_name, row.phone, row.origin), ('حسن محمدی', '09123334455', 'mehran'))
        self.assertEqual((int(row.cost), int(row.paid), row.remaining), (4_000_000, 1_000_000, 3_000_000))
        self.assertEqual(row.notes, 'بیعانه نقد')
        self.caravan.refresh_from_db()
        self.assertEqual(self.caravan.remaining_capacity, 24)
        self.assertIn('Ln:', ' '.join(self.buttons()))

    def test_next_person_keeps_origin_and_cost(self):
        self.add()
        self.tap(f'Ln:{self.caravan.id}')
        self.say('زینب کریمی')
        self.tap('Lskip')                             # بدون شماره
        self.assertEqual(self.chat().state, 'L_paid')  # مبدأ و هزینه دوباره پرسیده نشد
        self.tap('Lp0')
        self.tap('Lskip')
        second = self.rows().last()
        self.assertEqual((second.origin, int(second.cost), int(second.paid)), ('mehran', 4_000_000, 0))

    def test_ledger_shows_totals(self):
        self.add(paid='۱٬۰۰۰٬۰۰۰')
        self.add(name='زینب کریمی', phone=None, origin='qom', paid=None)
        self.tap(f'Lc:{self.caravan.id}:0')
        text = self.text()
        self.assertIn('نفرات: ۲', text)
        self.assertIn('جمع هزینه: ۸,۰۰۰,۰۰۰ تومان', text)
        self.assertIn('پرداخت‌شده: ۱,۰۰۰,۰۰۰ تومان', text)
        self.assertIn('الباقی: ۷,۰۰۰,۰۰۰ تومان', text)

    def test_installments_add_up(self):
        self.add(paid=None)
        row = self.rows().get()
        for amount in ('۱٬۰۰۰٬۰۰۰', '500000'):
            self.tap(f'Lpay:{row.id}')
            self.say(amount)
        row.refresh_from_db()
        self.assertEqual(int(row.paid), 1_500_000)
        self.tap(f'Lpay:{row.id}')
        self.say('دو میلیون')                          # متن به‌جای عدد
        self.assertEqual(self.chat().state, 'L_pay')
        row.refresh_from_db()
        self.assertEqual(int(row.paid), 1_500_000)

    def test_origin_and_delete(self):
        self.add()
        row = self.rows().get()
        self.tap(f'Lo2:{row.id}:qom')
        row.refresh_from_db()
        self.assertEqual(row.origin, 'qom')
        self.tap(f'Ldel:{row.id}')
        self.tap(f'Ldx:{row.id}')
        self.assertFalse(self.rows().exists())
        self.caravan.refresh_from_db()
        self.assertEqual(self.caravan.remaining_capacity, 25)

    def test_another_leaders_rows_are_out_of_reach(self):
        self.add()
        row = self.rows().get()
        stranger = User.objects.create_user(
            phone='09129999999', role='caravan_leader', is_leader_approved=True, bale_chat_id=str(CHAT + 5))
        for data in (f'Lr:{row.id}', f'Lpay:{row.id}', f'Ldx:{row.id}', f'Lc:{self.caravan.id}:0', f'La:{self.caravan.id}'):
            self.tap(data, chat=CHAT + 5)
            self.assertEqual(self.messages(), [], data)
        self.assertTrue(self.rows().exists())
        self.assertIsNotNone(stranger)

    def test_pilgrim_chat_cannot_open_a_ledger(self):
        self.tap(f'Lc:{self.caravan.id}:0', chat=CHAT + 7)
        self.assertEqual(self.messages(), [])
        self.assertIn('مدیر کاروان', self.toast())
