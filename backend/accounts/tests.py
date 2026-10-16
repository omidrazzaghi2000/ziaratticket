from unittest import mock

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import User
from core import bale_link


@override_settings(
    BALE_BOT_TOKEN='abc123',
    BALE_WEBHOOK_SECRET='secret-path-value',
    BALE_BOT_USERNAME='karvan_bot',
)
class BaleConnectionEndpointTests(TestCase):
    """
    بخش «اطلاع رزرو در بله» در داشبورد مدیر کاروان: گرفتن کد، دیدن وضعیت،
    قطع اتصال و پیام آزمایشی.
    """

    def setUp(self):
        self.leader = User.objects.create_user(
            phone='09120000001', full_name='حاج آقای مدیر',
            role='caravan_leader', is_leader_approved=True,
        )
        self.pilgrim = User.objects.create_user(phone='09120000002', full_name='زائر')
        self.client = APIClient()

    def _as(self, user):
        self.client.force_authenticate(user=user)

    def _connect(self, chat_id='4242'):
        """حساب مدیر کاروان را از قبل وصل‌شده فرض می‌کند."""
        self.leader.bale_chat_id = chat_id
        self.leader.save(update_fields=['bale_chat_id'])

    def test_leader_gets_a_one_time_code(self):
        self._as(self.leader)
        response = self.client.post('/api/user/bale')
        self.assertEqual(response.status_code, 200)
        code = response.data['code']
        self.assertEqual(len(code), bale_link.CODE_LENGTH)
        self.assertFalse(response.data['connected'])
        self.assertEqual(response.data['bot_url'], 'https://ble.ir/karvan_bot')

        self.leader.refresh_from_db()
        self.assertEqual(self.leader.bale_connect_code, code)
        self.assertTrue(bale_link.has_active_code(self.leader))

    def test_a_new_code_replaces_the_previous_one(self):
        self._as(self.leader)
        first = self.client.post('/api/user/bale').data['code']
        second = self.client.post('/api/user/bale').data['code']
        self.assertNotEqual(first, second)
        self.leader.refresh_from_db()
        self.assertEqual(self.leader.bale_connect_code, second)

    def test_status_shows_the_active_code_and_the_connection(self):
        self._as(self.leader)
        code = self.client.post('/api/user/bale').data['code']
        response = self.client.get('/api/user/bale')
        self.assertEqual(response.data['code'], code)
        self.assertFalse(response.data['connected'])

        self._connect()
        response = self.client.get('/api/user/bale')
        self.assertTrue(response.data['connected'])
        self.assertEqual(response.data['chat_id'], '4242')

    def test_disconnect_clears_the_chat_id(self):
        self._connect()
        self._as(self.leader)
        response = self.client.delete('/api/user/bale')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['connected'])
        self.leader.refresh_from_db()
        self.assertEqual(self.leader.bale_chat_id, '')

    def test_plain_user_is_refused(self):
        self._as(self.pilgrim)
        for method in (self.client.get, self.client.post, self.client.delete):
            self.assertEqual(method('/api/user/bale').status_code, 403)
        self.assertEqual(self.client.post('/api/user/bale/test').status_code, 403)
        self.pilgrim.refresh_from_db()
        self.assertEqual(self.pilgrim.bale_connect_code, '')

    def test_guest_is_refused(self):
        self.assertEqual(self.client.post('/api/user/bale').status_code, 401)

    def test_test_message_needs_a_connection_first(self):
        self._as(self.leader)
        response = self.client.post('/api/user/bale/test')
        self.assertEqual(response.status_code, 400)
        self.assertIn('وصل نشده', response.data['message'])

    def test_test_message_is_sent_to_the_connected_chat(self):
        self._connect()
        self._as(self.leader)
        with mock.patch('core.bale.send_message', return_value=True) as send:
            response = self.client.post('/api/user/bale/test')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(send.call_args.args[0], '4242')

    def test_failed_test_message_is_reported(self):
        self._connect()
        self._as(self.leader)
        with mock.patch('core.bale.send_message', return_value=False):
            response = self.client.post('/api/user/bale/test')
        self.assertEqual(response.status_code, 502)

    @override_settings(BALE_BOT_TOKEN='')
    def test_without_a_bot_token_nothing_is_sent(self):
        """سروری که ربات ندارد باید همین را بگوید، نه اینکه پیام بفرستد."""
        self._connect()
        self._as(self.leader)
        with mock.patch('core.bale.requests.post') as post:
            response = self.client.post('/api/user/bale/test')
        self.assertEqual(response.status_code, 503)
        post.assert_not_called()
        self.assertFalse(self.client.get('/api/user/bale').data['bot_configured'])

    @override_settings(BALE_WEBHOOK_SECRET='')
    def test_status_says_the_bot_is_not_ready_without_a_webhook(self):
        self._as(self.leader)
        self.assertFalse(self.client.get('/api/user/bale').data['bot_configured'])
