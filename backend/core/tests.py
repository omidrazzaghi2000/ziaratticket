import json
from datetime import timedelta
from unittest import mock

from django.test import SimpleTestCase, TestCase, override_settings
from django.utils import timezone

from accounts.models import User
from core import bale, bale_link


@override_settings(BALE_BOT_TOKEN='abc123', BALE_API_BASE='https://tapi.bale.ai')
class BaleClientTests(SimpleTestCase):
    def test_send_message_posts_to_bale_bot_api(self):
        response = mock.Mock(status_code=200)
        response.json.return_value = {'ok': True, 'result': {'message_id': 7}}
        with mock.patch('core.bale.requests.post', return_value=response) as post:
            self.assertTrue(bale.send_message('555', 'سلام'))
        url, = post.call_args.args
        self.assertEqual(url, 'https://tapi.bale.ai/botabc123/sendMessage')
        self.assertEqual(post.call_args.kwargs['json'], {'chat_id': '555', 'text': 'سلام'})

    def test_rejected_message_reports_failure(self):
        response = mock.Mock(status_code=400)
        response.json.return_value = {'ok': False, 'description': 'chat not found'}
        with mock.patch('core.bale.requests.post', return_value=response):
            with self.assertLogs('core.bale', level='WARNING'):
                self.assertFalse(bale.send_message('555', 'سلام'))

    def test_network_error_does_not_raise(self):
        import requests
        with mock.patch('core.bale.requests.post', side_effect=requests.ConnectionError('boom')):
            with self.assertLogs('core.bale', level='WARNING'):
                self.assertFalse(bale.send_message('555', 'سلام'))

    @override_settings(BALE_BOT_TOKEN='')
    def test_no_request_without_token(self):
        with mock.patch('core.bale.requests.post') as post:
            self.assertFalse(bale.send_message('555', 'سلام'))
        post.assert_not_called()


@override_settings(
    BALE_BOT_TOKEN='abc123',
    BALE_API_BASE='https://tapi.bale.ai',
    BALE_WEBHOOK_SECRET='secret-path-value',
)
class BaleWebhookTests(TestCase):
    """
    وصل‌شدن مدیر کاروان به ربات بله از طریق وب‌هوک.

    پیام‌هایی که ربات در جواب می‌فرستد مهم نیستند و ``send_message`` جعل
    می‌شود؛ چیزی که آزمایش می‌شود این است که شناسه‌ی چت درست ثبت شود و
    کد ناشناس یا کاربر غیرمدیر راه پیدا نکند.
    """

    url = '/api/bale/webhook/secret-path-value'

    def setUp(self):
        self.leader = User.objects.create_user(
            phone='09120000001', full_name='حاج آقای مدیر',
            role='caravan_leader', is_leader_approved=True,
        )
        self.pilgrim = User.objects.create_user(phone='09120000002', full_name='زائر')

    def _message(self, text, chat_id=4242):
        return {'update_id': 1, 'message': {'chat': {'id': chat_id}, 'text': text}}

    def _post(self, payload, url=None):
        with mock.patch('core.bale.send_message', return_value=True) as send:
            response = self.client.post(
                url or self.url, data=json.dumps(payload), content_type='application/json',
            )
        return response, send

    def test_leader_code_links_chat(self):
        code = bale_link.issue_connect_code(self.leader)
        response, send = self._post(self._message(code))
        self.assertEqual(response.status_code, 200)

        self.leader.refresh_from_db()
        self.assertEqual(self.leader.bale_chat_id, '4242')
        # کد یک‌بارمصرف است
        self.assertEqual(self.leader.bale_connect_code, '')
        self.assertIsNone(self.leader.bale_connect_code_expiry)
        # پیام تأیید فارسی فرستاده شد
        chat_id, text = send.call_args.args
        self.assertEqual(chat_id, 4242)
        self.assertIn('حاج آقای مدیر', text)

    def test_code_with_persian_digits_and_lowercase_is_accepted(self):
        code = bale_link.issue_connect_code(self.leader)
        typed = code.lower().translate(str.maketrans('0123456789', '۰۱۲۳۴۵۶۷۸۹'))
        self._post(self._message(f'  {typed} '))
        self.leader.refresh_from_db()
        self.assertEqual(self.leader.bale_chat_id, '4242')

    def test_unknown_code_is_rejected(self):
        bale_link.issue_connect_code(self.leader)
        response, send = self._post(self._message('ZZZZZZZZ'))
        self.assertEqual(response.status_code, 200)
        self.leader.refresh_from_db()
        self.assertEqual(self.leader.bale_chat_id, '')
        self.assertIn('منقضی', send.call_args.args[1])

    def test_expired_code_is_rejected(self):
        code = bale_link.issue_connect_code(self.leader)
        User.objects.filter(pk=self.leader.pk).update(
            bale_connect_code_expiry=timezone.now() - timedelta(minutes=1),
        )
        self._post(self._message(code))
        self.leader.refresh_from_db()
        self.assertEqual(self.leader.bale_chat_id, '')

    def test_plain_user_cannot_be_linked(self):
        """کد کسی که مدیر کاروان تأییدشده نیست، چت را وصل نمی‌کند."""
        code = bale_link.issue_connect_code(self.pilgrim)
        response, send = self._post(self._message(code))
        self.assertEqual(response.status_code, 200)
        self.pilgrim.refresh_from_db()
        self.assertEqual(self.pilgrim.bale_chat_id, '')
        self.assertEqual(self.pilgrim.bale_connect_code, '')
        self.assertIn('مدیر کاروان', send.call_args.args[1])

    def test_unapproved_leader_cannot_be_linked(self):
        pending = User.objects.create_user(
            phone='09120000003', role='caravan_leader', is_leader_approved=False,
        )
        code = bale_link.issue_connect_code(pending)
        self._post(self._message(code))
        pending.refresh_from_db()
        self.assertEqual(pending.bale_chat_id, '')

    def test_chat_moves_to_the_new_owner(self):
        """یک چت نباید هم‌زمان به دو حساب وصل بماند."""
        other = User.objects.create_user(
            phone='09120000004', role='caravan_leader', is_leader_approved=True,
            bale_chat_id='4242',
        )
        code = bale_link.issue_connect_code(self.leader)
        self._post(self._message(code))
        other.refresh_from_db()
        self.leader.refresh_from_db()
        self.assertEqual(other.bale_chat_id, '')
        self.assertEqual(self.leader.bale_chat_id, '4242')

    def test_start_sends_the_guide(self):
        _, send = self._post(self._message('/start'))
        self.assertIn('کد اتصال', send.call_args.args[1])

    def test_ordinary_chat_is_ignored_silently(self):
        _, send = self._post(self._message('سلام، کاروان نجف کِی حرکت می‌کند؟'))
        send.assert_not_called()

    def test_update_without_message_is_ignored(self):
        _, send = self._post({'update_id': 2, 'channel_post': {'text': 'x'}})
        send.assert_not_called()

    def test_wrong_secret_is_not_found(self):
        code = bale_link.issue_connect_code(self.leader)
        response, send = self._post(self._message(code), url='/api/bale/webhook/wrong-secret')
        self.assertEqual(response.status_code, 404)
        send.assert_not_called()
        self.leader.refresh_from_db()
        self.assertEqual(self.leader.bale_chat_id, '')

    @override_settings(BALE_WEBHOOK_SECRET='')
    def test_webhook_is_closed_without_a_configured_secret(self):
        """وب‌هوک تنظیم‌نشده باید بسته باشد، نه باز با رمز خالی."""
        code = bale_link.issue_connect_code(self.leader)
        response, _ = self._post(self._message(code))
        self.assertEqual(response.status_code, 404)
        self.assertEqual(self.client.post('/api/bale/webhook/').status_code, 404)

    @override_settings(BALE_BOT_TOKEN='')
    def test_nothing_breaks_without_a_bot_token(self):
        """بی‌توکن هم وب‌هوک باید بی‌صدا کار کند و اتصال ثبت شود."""
        code = bale_link.issue_connect_code(self.leader)
        with mock.patch('core.bale.requests.post') as post:
            response = self.client.post(
                self.url, data=json.dumps(self._message(code)), content_type='application/json',
            )
        self.assertEqual(response.status_code, 200)
        post.assert_not_called()
        self.leader.refresh_from_db()
        self.assertEqual(self.leader.bale_chat_id, '4242')


class BaleWebhookSetupTests(SimpleTestCase):
    @override_settings(BALE_BOT_TOKEN='abc123', BALE_WEBHOOK_SECRET='s3cr3t')
    def test_set_webhook_sends_the_full_url(self):
        with mock.patch('core.bale.call', return_value={}) as call:
            _, url = bale_link.set_webhook('https://ziaratticket.ir/')
        self.assertEqual(url, 'https://ziaratticket.ir/api/bale/webhook/s3cr3t')
        self.assertEqual(call.call_args.args, ('setWebhook', {'url': url}))
