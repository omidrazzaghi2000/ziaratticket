"""
ابزار خط فرمان ربات بله: راه‌اندازی وب‌هوک و نگاه‌کردن به چت‌ها.

راه معمولِ ثبت شناسه‌ی چت، خودِ مدیر کاروان است: در داشبورد «کد اتصال»
می‌گیرد و آن را به ربات می‌فرستد (نگاه کنید به ``core/bale_link.py``). برای
اینکه آن مسیر کار کند، وب‌هوک باید یک‌بار روی بله ثبت شود:

    python manage.py bale_chat_ids --set-webhook https://ziaratticket.ir

این دستور قابل تکرار است؛ هر بار همان آدرس را دوباره ثبت می‌کند. گزینه‌های
``--webhook-info`` و ``--delete-webhook`` هم برای عیب‌یابی هستند.

گزینه‌ی بدون آرگومان (نمایش چت‌ها با ``getUpdates``) راه قدیمی و دستی است و
فقط وقتی به کار می‌آید که وب‌هوک فعال نباشد؛ بله یک آپدیت را هم‌زمان به وب‌هوک
و هم به ``getUpdates`` نمی‌دهد.
"""

from django.conf import settings
from django.core.management.base import BaseCommand

from core import bale, bale_link


class Command(BaseCommand):
    help = 'راه‌اندازی وب‌هوک ربات بله و نمایش شناسه‌ی چت کاربران'

    def add_arguments(self, parser):
        parser.add_argument(
            '--send-test',
            metavar='CHAT_ID',
            help='ارسال یک پیام آزمایشی به این شناسه‌ی چت، برای اطمینان از درستی تنظیمات',
        )
        parser.add_argument(
            '--set-webhook',
            metavar='BASE_URL',
            help='ثبت وب‌هوک ربات روی این دامنه، مثل https://ziaratticket.ir',
        )
        parser.add_argument(
            '--webhook-info',
            action='store_true',
            help='نمایش وضعیت فعلی وب‌هوک روی بله',
        )
        parser.add_argument(
            '--delete-webhook',
            action='store_true',
            help='برداشتن وب‌هوک (برگشت به حالت دستی getUpdates)',
        )

    def handle(self, *args, **options):
        if not bale.is_configured():
            self.stderr.write(self.style.ERROR(
                'BALE_BOT_TOKEN تنظیم نشده است. توکن ربات را در محیط اجرا قرار دهید.'
            ))
            return

        if options.get('set_webhook'):
            self._set_webhook(options['set_webhook'])
            return

        if options.get('webhook_info'):
            info = bale_link.webhook_info()
            if info is None:
                self.stderr.write(self.style.ERROR('خواندن وضعیت وب‌هوک ناموفق بود؛ لاگ را ببینید.'))
            else:
                self.stdout.write(str(info))
            return

        if options.get('delete_webhook'):
            if bale_link.delete_webhook() is None:
                self.stderr.write(self.style.ERROR('برداشتن وب‌هوک ناموفق بود؛ لاگ را ببینید.'))
            else:
                self.stdout.write(self.style.SUCCESS('وب‌هوک برداشته شد.'))
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

    def _set_webhook(self, base_url):
        if not getattr(settings, 'BALE_WEBHOOK_SECRET', ''):
            self.stderr.write(self.style.ERROR(
                'BALE_WEBHOOK_SECRET تنظیم نشده است. یک رشته‌ی تصادفی بلند در محیط اجرا '
                'قرار دهید (همین رمز، مسیر وب‌هوک را محافظت می‌کند) و دوباره تلاش کنید.'
            ))
            return
        if not base_url.startswith('https://'):
            # بله فقط وب‌هوک HTTPS را می‌پذیرد.
            self.stderr.write(self.style.ERROR('آدرس باید با https:// شروع شود.'))
            return

        result, url = bale_link.set_webhook(base_url)
        if result is None:
            self.stderr.write(self.style.ERROR('ثبت وب‌هوک ناموفق بود؛ لاگ را ببینید.'))
            return
        self.stdout.write(self.style.SUCCESS('وب‌هوک ثبت شد:'))
        self.stdout.write(f'  {url}')
        self.stdout.write(
            'از این پس مدیر کاروان می‌تواند از داشبورد خودش «کد اتصال» بگیرد و به ربات بفرستد.'
        )
