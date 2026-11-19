"""دفتر کاروان: ردیف‌های خودکار از رزرو، ردیف دستی، جمع‌ها، ظرفیت، دسترسی."""
import importlib

from django.apps import apps
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from bookings import ledger, services
from bookings.models import Booking, LedgerRow
from carvans.models import Caravan

User = get_user_model()


class LedgerCase(TestCase):
    def setUp(self):
        self.leader = User.objects.create_user(phone='09120000301', role='caravan_leader', is_leader_approved=True)
        self.other = User.objects.create_user(phone='09120000302', role='caravan_leader', is_leader_approved=True)
        self.pilgrim = User.objects.create_user(phone='09120000303')
        self.caravan = Caravan.objects.create(
            name='کاروان ۴ آذر', destination='karbala', status='approved', leader=self.leader,
            departure_date='1499/09/04', duration=4, price=4_000_000, capacity=10, remaining_capacity=10,
            origin_city='قم و تهران', transit_cities=['مهران'],
        )
        self.api = APIClient()
        self.api.force_authenticate(self.leader)
        self.url = f'/api/leader/caravans/{self.caravan.id}/ledger'

    def book(self, count=2, city='تهران'):
        companions = [{'firstName': 'زهرا', 'lastName': 'رضایی', 'nationalId': '0012345679', 'phone': '09121112233'}][:count - 1]
        return services.place_booking(
            self.pilgrim, self.caravan, first_name='علی', last_name='رضایی', national_id='0012345678',
            phone='09120000303', passenger_count=count, boarding_city=city, companions=companions,
        )

    def capacity(self):
        self.caravan.refresh_from_db()
        return self.caravan.remaining_capacity


class AutomaticRowsTests(LedgerCase):
    def test_each_booked_person_gets_a_row(self):
        b = self.book(count=2)
        rows = list(LedgerRow.objects.filter(booking=b).order_by('id'))
        self.assertEqual([r.full_name for r in rows], ['علی رضایی', 'زهرا رضایی'])
        self.assertEqual([r.phone for r in rows], ['09120000303', '09121112233'])
        self.assertEqual({int(r.cost) for r in rows}, {4_000_000})
        self.assertEqual({r.origin for r in rows}, {'tehran'})

    def test_boarding_city_maps_to_the_four_origins(self):
        self.assertEqual(ledger.origin_from_city('قم'), 'qom')
        self.assertEqual(ledger.origin_from_city('مرز مهران'), 'mehran')
        self.assertEqual(ledger.origin_from_city('کرمانشاه'), 'transit')
        self.assertEqual(ledger.origin_from_city(''), '')

    def test_cancelled_booking_is_struck_not_deleted(self):
        b = self.book(count=2)
        LedgerRow.objects.filter(booking=b).update(paid=1_000_000)
        b.cancel()
        rows = LedgerRow.objects.filter(booking=b)
        self.assertEqual(rows.count(), 2)                         # پول داده‌شده گم نمی‌شود
        self.assertTrue(all(r.is_cancelled for r in rows))
        self.assertEqual(self.api.get(self.url).json()['totals']['count'], 0)

    def test_existing_bookings_are_backfilled(self):
        paid = Booking.objects.create(
            user=self.pilgrim, caravan=self.caravan, main_passenger_name='قدیمی', main_passenger_phone='09120000999',
            passenger_count=2, companions=[{'name': 'همراه قدیمی'}], total_price=8_000_000,
            transportation_type='bus', status='completed', is_completed=True, is_paid=True, boarding_city='قم',
        )
        Booking.objects.create(   # نیمه‌کاره و لغوشده نمی‌آیند
            user=self.pilgrim, caravan=self.caravan, main_passenger_name='نیمه', passenger_count=1,
            total_price=1, transportation_type='bus', status='pending')
        mig = importlib.import_module('bookings.migrations.0009_ledger')
        mig.backfill(apps, None)
        rows = LedgerRow.objects.filter(caravan=self.caravan).order_by('id')
        self.assertEqual([r.full_name for r in rows], ['قدیمی', 'همراه قدیمی'])
        self.assertEqual({(int(r.cost), int(r.paid), r.origin) for r in rows}, {(4_000_000, 4_000_000, 'qom')})
        self.assertEqual(rows[0].booking_id, paid.id)


class ManualRowsTests(LedgerCase):
    def test_add_takes_a_seat_and_uses_the_caravan_price(self):
        r = self.api.post(self.url, {'full_name': 'حسن محمدی', 'phone': '۰۹۱۲۳۳۳۴۴۵۵', 'origin': 'mehran',
                                     'paid': '۱٬۵۰۰٬۰۰۰'}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        row = r.json()['row']
        self.assertEqual((row['cost'], row['paid'], row['remaining']), (4_000_000, 1_500_000, 2_500_000))
        self.assertEqual(row['phone'], '09123334455')
        self.assertTrue(row['is_manual'])
        self.assertEqual(self.capacity(), 9)
        self.assertEqual(r.json()['caravan']['remaining_capacity'], 9)

    def test_full_caravan_refuses_more(self):
        Caravan.objects.filter(pk=self.caravan.pk).update(remaining_capacity=0)
        r = self.api.post(self.url, {'full_name': 'یک نفر'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('ظرفیت', r.json()['message'])

    def test_delete_gives_the_seat_back(self):
        row_id = self.api.post(self.url, {'full_name': 'حسن'}, format='json').json()['row']['id']
        self.assertEqual(self.api.delete(f'/api/leader/ledger/{row_id}').status_code, 200)
        self.assertEqual(self.capacity(), 10)

    def test_booking_rows_cannot_be_deleted_from_the_ledger(self):
        self.book(count=1)
        row = LedgerRow.objects.get()
        r = self.api.delete(f'/api/leader/ledger/{row.id}')
        self.assertEqual(r.status_code, 400)
        self.assertIn('لغو', r.json()['message'])

    def test_bad_input_is_refused(self):
        for body in ({'full_name': 'ا'}, {'full_name': 'حسن', 'origin': 'مشهد'},
                     {'full_name': 'حسن', 'paid': 'دو میلیون'}, {'full_name': 'حسن', 'paid': -5}):
            self.assertEqual(self.api.post(self.url, body, format='json').status_code, 400, body)
        self.assertEqual(self.capacity(), 10)


class EditAndTotalsTests(LedgerCase):
    def test_editing_paid_recomputes_remaining_and_totals(self):
        self.book(count=2)
        a, b = LedgerRow.objects.order_by('id')
        r = self.api.patch(f'/api/leader/ledger/{a.id}', {'paid': '۴٬۰۰۰٬۰۰۰'}, format='json')
        self.assertEqual(r.json()['row']['remaining'], 0)
        self.api.patch(f'/api/leader/ledger/{b.id}', {'paid': 1_000_000, 'notes': 'بقیه را نقد می‌دهد',
                                                      'origin': 'قم'}, format='json')
        t = self.api.get(self.url).json()['totals']
        self.assertEqual(t, {'count': 2, 'cost': 8_000_000, 'paid': 5_000_000, 'remaining': 3_000_000})
        b.refresh_from_db()
        self.assertEqual((b.origin, b.notes), ('qom', 'بقیه را نقد می‌دهد'))

    def test_payment_installments_add_up(self):
        self.book(count=1)
        row = LedgerRow.objects.get()
        ledger.record_payment(row, '۱٬۰۰۰٬۰۰۰')
        ledger.record_payment(row, 500_000)
        row.refresh_from_db()
        self.assertEqual((int(row.paid), row.remaining), (1_500_000, 2_500_000))

    def test_csv_has_the_requested_columns_and_a_totals_line(self):
        self.book(count=2)
        lines = self.api.get(f'{self.url}/export').content.decode('utf-8-sig').strip().splitlines()
        self.assertEqual(lines[0], 'ردیف,نام و نام خانوادگی,شماره تماس,مبلغ پرداخت شده,هزینه کاروان,الباقی مانده,مبدا,توضیحات')
        self.assertTrue(lines[1].startswith('1,علی رضایی'))
        self.assertIn('جمع (2 نفر)', lines[-1])


class AccessTests(LedgerCase):
    def test_another_leader_sees_nothing(self):
        self.book(count=1)
        row = LedgerRow.objects.get()
        self.api.force_authenticate(self.other)
        self.assertEqual(self.api.get(self.url).status_code, 404)
        self.assertEqual(self.api.post(self.url, {'full_name': 'نفوذی'}, format='json').status_code, 404)
        self.assertEqual(self.api.patch(f'/api/leader/ledger/{row.id}', {'paid': 1}, format='json').status_code, 404)
        self.assertEqual(self.api.get(f'{self.url}/export').status_code, 404)

    def test_login_required(self):
        self.assertEqual(APIClient().get(self.url).status_code, 401)
