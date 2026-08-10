from django.db import migrations


def backfill(apps, schema_editor):
    Booking = apps.get_model('bookings', 'Booking')
    counters = {}
    for b in Booking.objects.select_related('caravan').order_by('id'):
        changed = []
        if not b.main_passenger_first_name and b.main_passenger_name:
            parts = b.main_passenger_name.strip().split(' ', 1)
            b.main_passenger_first_name = parts[0][:50]
            b.main_passenger_last_name = (parts[1] if len(parts) > 1 else '')[:50]
            changed += ['main_passenger_first_name', 'main_passenger_last_name']
        if not b.booking_code and b.caravan_id:
            c = b.caravan
            table = str.maketrans('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩', '01234567890123456789')
            raw = str(c.departure_date or '').translate(table)
            digits = ''.join(ch for ch in raw if ch.isdigit())
            if not digits and c.start_date:
                digits = c.start_date.strftime('%Y%m%d')
            counters[c.id] = counters.get(c.id, 0) + 1
            b.booking_code = f"C{c.id}-{digits or '00000000'}-D{c.duration or 0}-{counters[c.id]:04d}"
            changed.append('booking_code')
        if changed:
            b.save(update_fields=changed)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0003_booking_booking_code_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill, noop),
    ]
