from unittest import mock

from django.test import SimpleTestCase, override_settings

from core import bale


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
