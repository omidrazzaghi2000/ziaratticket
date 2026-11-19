"""
دفتر کاروان در داشبورد مدیر: فهرست مسافران با هزینه، پرداختی و الباقی.

هر کاروان فقط برای مدیر خودش باز می‌شود؛ برای بقیه ۴۰۴ است، نه ۴۰۳، تا حتی
وجود کاروان دیگران معلوم نشود.
"""
import csv

from django.http import Http404, HttpResponse
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from carvans.models import Caravan
from core.jalali import format_jalali_datetime

from . import ledger
from .models import LedgerRow


def _own_caravan(request, pk):
    caravan = Caravan.objects.filter(pk=pk, leader=request.user).first()
    if caravan is None:
        raise Http404
    return caravan


def row_json(row):
    return {
        'id': row.id,
        'full_name': row.full_name,
        'phone': row.phone,
        'cost': int(row.cost),
        'paid': int(row.paid),
        'remaining': row.remaining,
        'origin': row.origin,
        'origin_display': ledger.ORIGIN_LABELS.get(row.origin, ''),
        'notes': row.notes,
        'is_cancelled': row.is_cancelled,
        'is_manual': row.is_manual,
        'booking_code': row.booking.booking_code if row.booking_id and row.booking else '',
        'created_at_jalali': format_jalali_datetime(row.created_at),
    }


def caravan_json(caravan):
    return {
        'id': caravan.id, 'name': caravan.name, 'departure_date': caravan.departure_date,
        'price': caravan.price, 'price_text': caravan.price_text,
        'capacity': caravan.capacity, 'remaining_capacity': caravan.remaining_capacity,
    }


def ledger_json(caravan):
    rows = ledger.rows_for(caravan)
    return {
        'caravan': caravan_json(caravan),
        'origins': [{'value': k, 'label': v} for k, v in LedgerRow.ORIGIN_CHOICES],
        'rows': [row_json(r) for r in rows],
        'totals': ledger.totals(rows),
    }


class LeaderLedgerView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        caravan = _own_caravan(request, pk)
        rows = LedgerRow.objects.filter(caravan=caravan).select_related('booking')
        data = ledger_json(caravan)
        data['rows'] = [row_json(r) for r in sorted(rows, key=lambda r: (r.is_cancelled, r.created_at, r.id))]
        return Response(data)

    def post(self, request, pk):
        caravan = _own_caravan(request, pk)
        d = request.data
        try:
            row = ledger.add_manual_row(
                caravan, full_name=d.get('full_name'), phone=d.get('phone', ''),
                origin=d.get('origin', ''), cost=d.get('cost'), paid=d.get('paid', 0),
                notes=d.get('notes', ''),
            )
        except ledger.LedgerError as exc:
            return Response({'message': exc.message}, status=400)
        caravan.refresh_from_db()
        return Response({
            'row': row_json(row), 'totals': ledger.totals(ledger.rows_for(caravan)),
            'caravan': caravan_json(caravan),
        }, status=201)


class LeaderLedgerRowView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _row(self, request, pk):
        row = LedgerRow.objects.select_related('caravan', 'booking').filter(
            pk=pk, caravan__leader=request.user).first()
        if row is None:
            raise Http404
        return row

    def patch(self, request, pk):
        row = self._row(request, pk)
        allowed = {'full_name', 'phone', 'cost', 'paid', 'origin', 'notes'}
        try:
            ledger.update_row(row, {k: v for k, v in request.data.items() if k in allowed})
        except ledger.LedgerError as exc:
            return Response({'message': exc.message}, status=400)
        return Response({'row': row_json(row), 'totals': ledger.totals(ledger.rows_for(row.caravan))})

    def delete(self, request, pk):
        row = self._row(request, pk)
        caravan = row.caravan
        try:
            ledger.delete_manual_row(row)
        except ledger.LedgerError as exc:
            return Response({'message': exc.message}, status=400)
        caravan.refresh_from_db()
        return Response({'totals': ledger.totals(ledger.rows_for(caravan)), 'caravan': caravan_json(caravan)})


class LeaderLedgerExportView(APIView):
    """همان جدول، با همان ترتیب ستون‌ها، برای اکسل؛ آخرش ردیف جمع."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        caravan = _own_caravan(request, pk)
        rows = ledger.rows_for(caravan)
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="ledger-{caravan.id}.csv"'
        response.write('﻿')  # BOM تا اکسل فارسی را درست باز کند
        w = csv.writer(response)
        w.writerow(['ردیف', 'نام و نام خانوادگی', 'شماره تماس', 'مبلغ پرداخت شده',
                    'هزینه کاروان', 'الباقی مانده', 'مبدا', 'توضیحات'])
        n = 0
        for r in rows:
            if r.is_cancelled:
                continue
            n += 1
            w.writerow([n, r.full_name, f'="{r.phone}"' if r.phone else '', int(r.paid), int(r.cost),
                        r.remaining, ledger.ORIGIN_LABELS.get(r.origin, ''), r.notes])
        t = ledger.totals(rows)
        w.writerow(['', f'جمع ({t["count"]} نفر)', '', t['paid'], t['cost'], t['remaining'], '', ''])
        return response
