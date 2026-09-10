from django.db import models


class Contact(models.Model):
    name = models.CharField('نام و نام خانوادگی', max_length=120)
    phone = models.CharField('شماره تماس', max_length=20)
    email = models.EmailField('ایمیل', blank=True, null=True)
    subject = models.CharField('موضوع', max_length=120)
    message = models.TextField('متن پیام')
    created_at = models.DateTimeField('تاریخ ارسال', auto_now_add=True)

    class Meta:
        verbose_name = 'پیام تماس با ما'
        verbose_name_plural = 'پیام‌های تماس با ما'
        ordering = ('-created_at',)

    def __str__(self):
        return f'{self.name} — {self.subject}'


class Newsletter(models.Model):
    email = models.EmailField('ایمیل', unique=True)
    created_at = models.DateTimeField('تاریخ عضویت', auto_now_add=True)

    class Meta:
        verbose_name = 'عضو خبرنامه'
        verbose_name_plural = 'اعضای خبرنامه'
        ordering = ('-created_at',)

    def __str__(self):
        return self.email
