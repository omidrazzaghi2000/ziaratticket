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
