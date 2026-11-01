"""
زمان‌بندی ثبت‌نام کاروان.

ساعت در همه‌ی تست‌ها ثابت است تا با گذشت روزها نشکنند. مرجع:
۱۴۰۵/۰۸/۰۹ = ۲۰۲۶-۱۰-۳۱ — همان روزی که ثبت‌نام باید خودش باز می‌شد و نشد.
"""
from datetime import datetime, time
from unittest import mock
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from rest_framework.test import APIClient

from carvans.models import Caravan

TEHRAN = ZoneInfo('Asia/Tehran')


def at(y, m, d, hh=0, mm=0, ss=0):
    return datetime(y, m, d, hh, mm, ss, tzinfo=TEHRAN)


def caravan(**kw):
    data = dict(
        name='کاروان آزمون', destination='karbala', status='approved',
        departure_date='1405/08/27', duration=5, transportation_type='bus',
        accommodation_type='hotel', price=1_000_000, capacity=10, remaining_capacity=10,
        registration_state='open',
    )
    data.update(kw)
    return Caravan(**data)


class RegistrationWindowTests(TestCase):
    def test_soon_opens_by_itself_on_the_day(self):
        """دقیقاً گزارش‌شده: «به‌زودی» با تاریخ ۹ آبان، بدون عوض‌کردن دستی وضعیت."""
        c = caravan(registration_state='soon', registration_opens_on='۱۴۰۵/۰۸/۰۹')
        self.assertEqual(c.registration_status(at(2026, 10, 30, 23, 59)), 'soon')
        self.assertEqual(c.registration_status(at(2026, 10, 31, 0, 0)), 'open')

    def test_opens_at_the_given_hour(self):
        c = caravan(registration_state='soon', registration_opens_on='1405/08/09',
                    registration_opens_time=time(10, 0))
        self.assertEqual(c.registration_status(at(2026, 10, 31, 9, 59)), 'soon')
        self.assertEqual(c.registration_status(at(2026, 10, 31, 10, 0)), 'open')

    def test_future_open_date_wins_over_manual_open(self):
        c = caravan(registration_state='open', registration_opens_on='1405/08/09')
        self.assertEqual(c.registration_status(at(2026, 10, 30, 12)), 'soon')

    def test_soon_without_a_date_waits_for_the_manager(self):
        c = caravan(registration_state='soon')
        # هر روزی پیش از حرکت (۲۷ آبان)؛ بعد از حرکت به‌درستی «بسته» است
        self.assertEqual(c.registration_status(at(2026, 11, 15)), 'soon')

    def test_close_date_without_hour_keeps_the_whole_day(self):
        c = caravan(registration_closes_on='1405/08/20')  # = 2026-11-11
        self.assertEqual(c.registration_status(at(2026, 11, 11, 23, 59)), 'open')
        self.assertTrue(c.is_listed(at(2026, 11, 11, 23, 59)))
        self.assertEqual(c.registration_status(at(2026, 11, 12, 0, 0)), 'closed')
        self.assertFalse(c.is_listed(at(2026, 11, 12, 0, 0)))

    def test_closes_at_the_given_hour(self):
        c = caravan(registration_closes_on='1405/08/20', registration_closes_time=time(18, 0))
        self.assertEqual(c.registration_status(at(2026, 11, 11, 17, 59)), 'open')
        self.assertEqual(c.registration_status(at(2026, 11, 11, 18, 0)), 'closed')

    def test_departed_caravan_closes_and_disappears(self):
        c = caravan(departure_date='1405/08/09')  # = 2026-10-31
        self.assertTrue(c.is_listed(at(2026, 10, 31, 20)))   # خود روز حرکت هنوز دیده می‌شود
        self.assertFalse(c.is_listed(at(2026, 11, 1, 0, 0)))
        self.assertEqual(c.registration_status(at(2026, 11, 1)), 'closed')

    def test_manual_closed_stays_visible(self):
        c = caravan(registration_state='closed')
        self.assertEqual(c.registration_status(at(2026, 10, 31)), 'closed')
        self.assertTrue(c.is_listed(at(2026, 10, 31)))

    def test_labels_follow_the_clock(self):
        c = caravan(registration_state='soon', registration_opens_on='۱۴۰۵/۰۸/۰۹',
                    registration_opens_time=time(10, 0))
        with mock.patch('django.utils.timezone.now', return_value=at(2026, 10, 31, 9)):
            self.assertEqual(c.availability_label, 'ثبت‌نام از ۱۴۰۵/۰۸/۰۹ ساعت 10:00')
            self.assertFalse(c.is_bookable)
        with mock.patch('django.utils.timezone.now', return_value=at(2026, 10, 31, 10)):
            self.assertEqual(c.availability_label, '10 نفر ظرفیت')
            self.assertTrue(c.is_bookable)
        gone = caravan(departure_date='1405/08/01')
        with mock.patch('django.utils.timezone.now', return_value=at(2026, 11, 1)):
            self.assertEqual(gone.availability_label, 'تاریخ حرکت گذشته')


class RegistrationValidationTests(TestCase):
    def assertInvalid(self, field, **kw):
        with self.assertRaises(ValidationError) as ctx:
            caravan(**kw).clean()
        self.assertIn(field, ctx.exception.message_dict)

    def test_unreadable_dates_are_refused(self):
        self.assertInvalid('registration_opens_on', registration_opens_on='۹ آبان')
        self.assertInvalid('registration_closes_on', registration_closes_on='1405/13/01')
        self.assertInvalid('departure_date', departure_date='اواخر آبان')

    def test_close_must_come_after_open(self):
        self.assertInvalid('registration_closes_on',
                           registration_opens_on='1405/08/10', registration_closes_on='1405/08/09')

    def test_hour_needs_a_date(self):
        self.assertInvalid('registration_opens_time', registration_opens_time=time(10))

    def test_a_valid_window_passes(self):
        caravan(registration_opens_on='1405/08/09', registration_opens_time=time(10),
                registration_closes_on='1405/08/20').clean()

    def test_phone_number_is_not_a_chat_id(self):
        with self.assertRaises(ValidationError):
            caravan(bale_chat_id='09378014934').full_clean(exclude=['leader'])


class RegistrationEnforcementTests(TestCase):
    """برچسب کافی نیست؛ خود سرور هم باید جلوی رزرو و نمایش را بگیرد."""

    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(phone='09120000009', full_name='زائر')
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def step1(self, c):
        return self.client.post('/api/bookings/step1', {
            'caravan_id': c.id, 'first_name': 'علی', 'last_name': 'رضایی',
            'main_passenger_id': '0012345678', 'main_passenger_phone': '09120000009',
            'passenger_count': 1,
        }, format='json')

    def test_booking_follows_the_open_time(self):
        c = caravan(registration_state='soon', registration_opens_on='1405/08/09',
                    registration_opens_time=time(10, 0))
        c.save()
        with mock.patch('django.utils.timezone.now', return_value=at(2026, 10, 31, 9, 59)):
            r = self.step1(c)
            self.assertEqual(r.status_code, 400, r.content)
            self.assertIn('ساعت 10:00', r.json()['message'])
        with mock.patch('django.utils.timezone.now', return_value=at(2026, 10, 31, 10, 0)):
            self.assertEqual(self.step1(c).status_code, 201)

    def test_list_and_stats_drop_expired_caravans(self):
        live = caravan(name='زنده'); live.save()
        departed = caravan(name='رفته', departure_date='1405/08/01'); departed.save()
        expired = caravan(name='مهلت‌گذشته', registration_closes_on='1405/08/05'); expired.save()
        with mock.patch('django.utils.timezone.now', return_value=at(2026, 11, 1, 12)):
            names = [c['name'] for c in self.client.get('/api/caravans').json()]
            stats = self.client.get('/api/stats').json()
        self.assertEqual(names, ['زنده'])
        self.assertEqual(stats['active_caravans'], 1)
