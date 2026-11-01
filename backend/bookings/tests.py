from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from bookings.models import Booking
from bookings.notifications import build_booking_summary, notify_leader_of_booking
from carvans.models import Caravan

User = get_user_model()


@override_settings(BALE_BOT_TOKEN='test-token', BALE_FALLBACK_CHAT_ID='')
class BaleBookingNotificationTests(TestCase):
    def setUp(self):
        self.leader = User.objects.create_user(
            phone='09120000001', full_name='حاج آقا راهنما',
            role='caravan_leader', is_leader_approved=True, bale_chat_id='111',
        )
        self.pilgrim = User.objects.create_user(phone='09120000002', full_name='زائر')
        self.caravan = Caravan.objects.create(
            name='کاروان نور', destination='karbala', status='approved',
            leader=self.leader, departure_date='۱۴۰۵/۰۸/۱۵', duration=7,
            price=50_000_000, capacity=44, remaining_capacity=42,
        )
        self.booking = Booking.objects.create(
            user=self.pilgrim, caravan=self.caravan,
            main_passenger_name='علی رضایی', main_passenger_id='1234567890',
            main_passenger_phone='09120000002', passenger_count=2,
            companions=[{'name': 'زهرا رضایی', 'nationalId': '1234567891'}],
            selected_seats=[12, 13], total_price=100_000_000,
            transportation_type='bus', is_completed=True, status='completed',
        )

    def test_summary_contains_booking_essentials(self):
        text = build_booking_summary(self.booking)
        self.assertIn('کاروان نور', text)
        self.assertIn(self.booking.booking_code, text)
        self.assertIn('علی رضایی', text)
        self.assertIn('زهرا رضایی', text)
        self.assertIn('۱۴۰۵/۰۸/۱۵', text)
        self.assertIn('100,000,000 تومان', text)
        self.assertIn('12، 13', text)

    def test_notification_goes_to_leader_chat(self):
        with mock.patch('core.bale.send_message_async') as send:
            self.assertTrue(notify_leader_of_booking(self.booking))
        send.assert_called_once()
        chat_id, text = send.call_args.args
        self.assertEqual(chat_id, '111')
        self.assertIn('رزرو جدید ثبت شد', text)

    def test_caravan_chat_id_overrides_leader(self):
        self.caravan.bale_chat_id = '222'
        self.caravan.save(update_fields=['bale_chat_id'])
        self.booking.refresh_from_db()
        with mock.patch('core.bale.send_message_async') as send:
            notify_leader_of_booking(self.booking)
        self.assertEqual(send.call_args.args[0], '222')

    def test_nothing_sent_without_a_chat_id(self):
        self.leader.bale_chat_id = ''
        self.leader.save(update_fields=['bale_chat_id'])
        self.booking.refresh_from_db()
        with mock.patch('core.bale.send_message_async') as send:
            self.assertFalse(notify_leader_of_booking(self.booking))
        send.assert_not_called()

    @override_settings(BALE_BOT_TOKEN='')
    def test_nothing_sent_without_a_bot_token(self):
        with mock.patch('core.bale.send_message_async') as send:
            self.assertFalse(notify_leader_of_booking(self.booking))
        send.assert_not_called()


@override_settings(BALE_BOT_TOKEN='test-token', BALE_FALLBACK_CHAT_ID='')
class BaleOutcomeIsRecordedTests(BaleBookingNotificationTests):
    """هر نتیجه‌ای روی خود رزرو ثبت شود، تا «چرا پیام نیامد» در پنل جواب داشته باشد."""

    def fresh(self):
        self.booking.refresh_from_db()
        return self.booking

    def test_delivered_send_is_stamped(self):
        with mock.patch('core.bale.send_message_async') as send:
            notify_leader_of_booking(self.booking)
        send.call_args.kwargs['on_done'](True, '')
        self.assertIsNotNone(self.fresh().bale_notified_at)
        self.assertEqual(self.booking.bale_notify_error, '')

    def test_rejected_send_keeps_bales_reason(self):
        with mock.patch('core.bale.send_message_async') as send:
            notify_leader_of_booking(self.booking)
        send.call_args.kwargs['on_done'](False, 'بله رد کرد: chat not found')
        self.assertIsNone(self.fresh().bale_notified_at)
        self.assertIn('chat not found', self.booking.bale_notify_error)

    def test_missing_chat_id_is_recorded(self):
        self.leader.bale_chat_id = ''
        self.leader.save(update_fields=['bale_chat_id'])
        self.booking.refresh_from_db()
        notify_leader_of_booking(self.booking)
        self.assertIn('شناسه‌ی چت', self.fresh().bale_notify_error)

    def test_token_never_reaches_the_log(self):
        import requests
        from core import bale
        boom = requests.ConnectionError('HTTPSConnectionPool: /bottest-token/sendMessage')
        with mock.patch('core.bale.requests.post', side_effect=boom):
            with self.assertLogs('core.bale', level='WARNING') as logs:
                ok, error = bale.send_message_detailed('111', 'سلام')
        self.assertFalse(ok)
        self.assertNotIn('test-token', ' '.join(logs.output) + error)


class LeaderCancelTests(TestCase):
    """لغو رزرو از داشبورد مدیر: صندلی دقیقاً یک‌بار و فقط اگر گرفته شده بود برگردد."""

    def setUp(self):
        from rest_framework.test import APIClient
        self.leader = User.objects.create_user(phone='09120000101', role='caravan_leader', is_leader_approved=True)
        self.other = User.objects.create_user(phone='09120000102', role='caravan_leader', is_leader_approved=True)
        pilgrim = User.objects.create_user(phone='09120000103')
        self.caravan = Caravan.objects.create(
            name='کاروان لغو', destination='karbala', status='approved', leader=self.leader,
            departure_date='1499/08/27', duration=5, price=1_000_000, capacity=40, remaining_capacity=37,
            origin_city='قم و تهران', transit_cities=['کرمانشاه'],
        )
        # رزرو تکمیل‌شده‌ی ۳ نفره — همان ۳ صندلی که از ۴۰ کم شده
        self.done = Booking.objects.create(
            user=pilgrim, caravan=self.caravan, main_passenger_name='سرپرست', passenger_count=3,
            total_price=3_000_000, transportation_type='bus', status='completed', is_completed=True,
            selected_seats=[5, 6, 7],
        )
        self.api = APIClient()

    def cancel(self, booking, as_user=None):
        self.api.force_authenticate(as_user or self.leader)
        return self.api.delete(f'/api/leader/bookings/{booking.id}')

    def capacity(self):
        self.caravan.refresh_from_db()
        return self.caravan.remaining_capacity

    def test_cancel_gives_the_seats_back(self):
        r = self.cancel(self.done)
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(self.capacity(), 40)
        self.done.refresh_from_db()
        self.assertEqual(self.done.status, 'cancelled')

    def test_cancelling_twice_does_not_add_seats_twice(self):
        self.cancel(self.done)
        r = self.cancel(self.done)
        self.assertEqual(r.status_code, 200)
        self.assertIn('قبلاً', r.json()['message'])
        self.assertEqual(self.capacity(), 40)

    def test_unfinished_booking_never_held_seats(self):
        half = Booking.objects.create(
            user=self.done.user, caravan=self.caravan, main_passenger_name='نیمه‌کاره',
            passenger_count=2, total_price=0, transportation_type='bus', status='pending',
        )
        self.cancel(half)
        self.assertEqual(self.capacity(), 37)

    def test_seat_map_frees_the_seats(self):
        from bookings.views import occupied_seats_for
        self.cancel(self.done)
        self.assertEqual(occupied_seats_for(self.caravan), {})

    def test_capacity_never_exceeds_the_total(self):
        Caravan.objects.filter(pk=self.caravan.pk).update(remaining_capacity=39)
        self.cancel(self.done)
        self.assertEqual(self.capacity(), 40)

    def test_another_leader_cannot_cancel(self):
        self.assertEqual(self.cancel(self.done, as_user=self.other).status_code, 404)
        self.assertEqual(self.capacity(), 37)

    def test_request_without_login_is_refused(self):
        """همان چیزی که دکمه می‌فرستاد: بدون توکن."""
        from rest_framework.test import APIClient
        self.assertEqual(APIClient().delete(f'/api/leader/bookings/{self.done.id}').status_code, 401)

    def test_cancelled_booking_cannot_be_revived_by_patch(self):
        self.cancel(self.done)
        r = self.api.patch(f'/api/leader/bookings/{self.done.id}', {'status': 'confirmed'}, format='json')
        self.assertEqual(r.status_code, 400)

    def test_admin_cancel_action_gives_seats_back(self):
        from django.contrib.admin.sites import AdminSite
        from bookings.admin import BookingAdmin
        admin = BookingAdmin(Booking, AdminSite())
        with mock.patch.object(admin, 'message_user'):
            admin.mark_as_cancelled(None, Booking.objects.filter(pk=self.done.pk))
        self.assertEqual(self.capacity(), 40)


class BoardingCityTests(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient
        self.user = User.objects.create_user(phone='09120000201')
        self.api = APIClient()
        self.api.force_authenticate(self.user)

    def make(self, **kw):
        data = dict(name='ک', destination='karbala', status='approved', departure_date='1499/08/27',
                    duration=5, price=1_000_000, capacity=40, remaining_capacity=40)
        data.update(kw)
        return Caravan.objects.create(**data)

    def step1(self, caravan, **extra):
        payload = {'caravan_id': caravan.id, 'first_name': 'علی', 'last_name': 'رضایی',
                   'main_passenger_id': '0012345678', 'main_passenger_phone': '09120000201',
                   'passenger_count': 1, **extra}
        return self.api.post('/api/bookings/step1', payload, format='json')

    def test_options_come_from_origin_and_transit_cities(self):
        c = self.make(origin_city='قم و تهران', transit_cities=['کرمانشاه', 'قم'])
        self.assertEqual(c.boarding_options, ['قم', 'تهران', 'کرمانشاه'])
        # «و» داخل اسم شهر جداکننده نیست
        self.assertEqual(self.make(origin_city='ورامین').boarding_options, ['ورامین'])

    def test_choice_is_stored(self):
        c = self.make(origin_city='قم و تهران')
        r = self.step1(c, boarding_city='تهران')
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(Booking.objects.get(pk=r.json()['bookingId']).boarding_city, 'تهران')

    def test_city_outside_the_route_is_refused(self):
        r = self.step1(self.make(origin_city='قم و تهران'), boarding_city='مشهد')
        self.assertEqual(r.status_code, 400)

    def test_single_origin_is_filled_in(self):
        r = self.step1(self.make(origin_city='تهران'))
        self.assertEqual(Booking.objects.get(pk=r.json()['bookingId']).boarding_city, 'تهران')

    def test_booking_date_is_jalali_in_tehran_time(self):
        from datetime import datetime, timezone as dtz
        from bookings.serializers import BookingSerializer
        b = Booking.objects.get(pk=self.step1(self.make(origin_city='تهران')).json()['bookingId'])
        Booking.objects.filter(pk=b.pk).update(created_at=datetime(2026, 11, 1, 21, 0, tzinfo=dtz.utc))
        b.refresh_from_db()
        # ۲۱:۰۰ UTC = ۰۰:۳۰ بامداد روز بعد در تهران
        self.assertEqual(BookingSerializer(b).data['created_at_jalali'], '1405/08/11 00:30')
