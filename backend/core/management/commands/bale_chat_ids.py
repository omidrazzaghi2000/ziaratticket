"""
نمایش شناسه‌ی چت کسانی که به ربات بله پیام داده‌اند.

مدیر کاروان ابتدا در بله ربات را باز می‌کند و یک پیام (مثلاً /start) می‌فرستد؛
سپس با اجرای این دستور شناسه‌ی چتش دیده می‌شود و در پنل مدیریت، در فیلد
«شناسه چت بله» حساب او (یا کاروان) ثبت می‌شود.
"""

from django.core.management.base import BaseCommand

from core import bale


class Command(BaseCommand):
    help = 'نمایش شناسه‌ی چت کاربرانی که اخیراً به ربات بله پیام داده‌اند'

    def add_arguments(self, parser):
        parser.add_argument(
            '--send-test',
            metavar='CHAT_ID',
            help='ارسال یک پیام آزمایشی به این شناسه‌ی چت، برای اطمینان از درستی تنظیمات',
        )

    def handle(self, *args, **options):
        if not bale.is_configured():
            self.stderr.write(self.style.ERROR(
                'BALE_BOT_TOKEN تنظیم نشده است. توکن ربات را در محیط اجرا قرار دهید.'
            ))
            return

        test_chat_id = options.get('send_test')
        if test_chat_id:
            ok = bale.send_message(test_chat_id, 'پیام آزمایشی سامانه کاروان کربلا ✅')
            if ok:
                self.stdout.write(self.style.SUCCESS(f'پیام آزمایشی به {test_chat_id} ارسال شد.'))
            else:
                self.stderr.write(self.style.ERROR(
                    f'ارسال پیام آزمایشی به {test_chat_id} ناموفق بود؛ لاگ را ببینید.'
                ))
            return

        updates = bale.call('getUpdates') or []
        if not updates:
            self.stdout.write(
                'پیام تازه‌ای برای ربات نیست. از مدیر کاروان بخواهید در بله به ربات پیام بدهد '
                'و دستور را دوباره اجرا کنید.'
            )
            return

        seen = {}
        for update in updates:
            message = update.get('message') or update.get('edited_message') or {}
            chat = message.get('chat') or {}
            chat_id = chat.get('id')
            if chat_id is None or chat_id in seen:
                continue
            name = ' '.join(filter(None, [chat.get('first_name'), chat.get('last_name')])).strip()
            seen[chat_id] = name or chat.get('title') or chat.get('username') or '—'

        self.stdout.write(self.style.SUCCESS(f'{len(seen)} چت پیدا شد:'))
        for chat_id, name in seen.items():
            self.stdout.write(f'  {chat_id}  —  {name}')
