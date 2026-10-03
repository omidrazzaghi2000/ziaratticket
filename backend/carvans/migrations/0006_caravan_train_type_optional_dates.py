from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('carvans', '0005_caravan_bus_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='caravan',
            name='train_type',
            field=models.CharField(
                blank=True,
                choices=[('coach', 'اتوبوسی'), ('four_bed', '۴ تخته'), ('six_bed', '۶ تخته')],
                default='',
                help_text='فقط برای سفرهای قطاری: اتوبوسی، ۴ تخته یا ۶ تخته.',
                max_length=20,
                verbose_name='نوع واگن قطار',
            ),
        ),
        migrations.AlterField(
            model_name='caravan',
            name='start_date',
            field=models.DateTimeField(blank=True, null=True, verbose_name='تاریخ شروع'),
        ),
        migrations.AlterField(
            model_name='caravan',
            name='end_date',
            field=models.DateTimeField(blank=True, null=True, verbose_name='تاریخ پایان'),
        ),
    ]
