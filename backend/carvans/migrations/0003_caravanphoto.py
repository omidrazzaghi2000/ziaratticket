from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('carvans', '0002_alter_caravan_options_caravan_accommodation_city_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='CaravanPhoto',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('photo', models.ImageField(upload_to='caravan_photos/', verbose_name='تصویر')),
                ('caption', models.CharField(blank=True, max_length=200, verbose_name='توضیح تصویر')),
                ('category', models.CharField(
                    choices=[
                        ('accommodation', 'اقامتگاه'),
                        ('transport', 'حمل‌ونقل'),
                        ('shrine', 'حرم و اماکن مقدس'),
                        ('general', 'عمومی'),
                    ],
                    default='general',
                    max_length=20,
                    verbose_name='دسته‌بندی',
                )),
                ('order', models.IntegerField(default=0, verbose_name='ترتیب نمایش')),
                ('caravan', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='photos',
                    to='carvans.caravan',
                    verbose_name='کاروان',
                )),
            ],
            options={
                'verbose_name': 'تصویر کاروان',
                'verbose_name_plural': 'تصاویر کاروان',
                'ordering': ['order', 'id'],
            },
        ),
    ]
