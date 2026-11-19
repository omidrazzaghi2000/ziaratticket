import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Download, Plus, Printer, Trash2, Loader2 } from "lucide-react";

import { djangoURL } from "@/App";
import Header from "@/components/Header";
import { useAuth } from "@/components/auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/auth";
import { toLatinDigits, toPersianDigits } from "@/lib/digits";

/**
 * دفتر یک کاروان: هر مسافر یک ردیف با هزینه، پرداختی و الباقی.
 *
 * رزروهای سایت و ربات بله خودشان ردیف می‌شوند؛ ثبت‌نام تلفنی و حضوری از
 * نوار «افزودن زائر» بالای جدول. جمع‌ها و الباقی همیشه از روی همین ردیف‌ها
 * حساب می‌شوند، پس هیچ عددی دستی جمع زده نمی‌شود.
 */

interface Row {
  id: number;
  full_name: string;
  phone: string;
  cost: number;
  paid: number;
  remaining: number;
  origin: string;
  origin_display: string;
  notes: string;
  is_cancelled: boolean;
  is_manual: boolean;
  booking_code: string;
  created_at_jalali: string;
}

interface Ledger {
  caravan: {
    id: number;
    name: string;
    departure_date: string;
    price: number;
    price_text?: string;
    capacity: number;
    remaining_capacity: number;
  };
  origins: { value: string; label: string }[];
  rows: Row[];
}

type Editable = Pick<Row, "full_name" | "phone" | "cost" | "paid" | "origin" | "notes">;

const fa = toPersianDigits;
const money = (n: number) => fa(Math.abs(n).toLocaleString("en-US"));

/** «۲٬۵۰۰٬۰۰۰»، «2,500,000» → 2500000؛ هر چیز غیرعددی → NaN */
function parseMoney(text: string): number {
  const digits = toLatinDigits(text).replace(/[,\s٬]/g, "");
  if (digits === "") return 0;
  return /^\d+$/.test(digits) ? Number(digits) : NaN;
}

async function api(url: string, init?: RequestInit) {
  const res = await authFetch(`${djangoURL}${url}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "ذخیره نشد؛ دوباره تلاش کنید");
  return data;
}

function totalsOf(rows: Row[]) {
  const active = rows.filter(r => !r.is_cancelled);
  const cost = active.reduce((s, r) => s + r.cost, 0);
  const paid = active.reduce((s, r) => s + r.paid, 0);
  return { count: active.length, cost, paid, remaining: cost - paid };
}

/** مبلغ: موقع نوشتن خام، بعدش با جداکننده و ارقام فارسی */
function MoneyInput({
  value, onChange, onCommit, className = "", ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit?: () => void;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [focused, setFocused] = useState(false);
  const n = parseMoney(value);
  const shown = focused || Number.isNaN(n) ? fa(value) : n ? money(n) : "";
  return (
    <input
      {...rest}
      inputMode="numeric"
      dir="ltr"
      value={shown}
      onFocus={() => setFocused(true)}
      onBlur={() => { setFocused(false); onCommit?.(); }}
      onChange={e => onChange(e.target.value)}
      className={`w-full bg-transparent text-left tabular-nums outline-none rounded-md px-2 py-1.5 focus:bg-background focus:ring-2 focus:ring-primary/40 ${Number.isNaN(n) ? "ring-2 ring-red-400" : ""} ${className}`}
    />
  );
}

function OriginPicker({
  value, options, onPick, size = "sm",
}: {
  value: string;
  options: Ledger["origins"];
  onPick: (v: string) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className={`flex gap-1 ${size === "sm" ? "flex-nowrap" : "flex-wrap"}`}>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onPick(value === o.value ? "" : o.value)}
          className={`rounded-full border transition-colors whitespace-nowrap ${
            size === "md" ? "px-3 py-1.5 text-sm" : "px-2 py-0.5 text-xs"
          } ${value === o.value
            ? "bg-primary text-primary-foreground border-primary"
            : "border-border text-muted-foreground hover:border-primary/50"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function LedgerRow({
  row, index, origins, onSaved, onDelete,
}: {
  row: Row;
  index: number;
  origins: Ledger["origins"];
  onSaved: (row: Row) => void;
  onDelete: (row: Row) => void;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = useState({
    full_name: row.full_name, phone: row.phone, cost: String(row.cost), paid: String(row.paid), notes: row.notes,
  });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setDraft({ full_name: row.full_name, phone: row.phone, cost: String(row.cost), paid: String(row.paid), notes: row.notes });
  }, [row.full_name, row.phone, row.cost, row.paid, row.notes]);

  // الباقی همان لحظه‌ای که مبلغ را تایپ می‌کنید عوض می‌شود، نه بعد از ذخیره
  const cost = parseMoney(draft.cost);
  const paid = parseMoney(draft.paid);
  const remaining = Number.isNaN(cost) || Number.isNaN(paid) ? row.remaining : cost - paid;

  const save = async (patch: Partial<Editable>) => {
    const changed = Object.entries(patch).some(([k, v]) => String(v) !== String((row as any)[k]));
    if (!changed) return;
    if (("cost" in patch && Number.isNaN(patch.cost)) || ("paid" in patch && Number.isNaN(patch.paid))) {
      toast({ title: "مبلغ باید عدد باشد", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const data = await api(`/api/leader/ledger/${row.id}`, { method: "PATCH", body: JSON.stringify(patch) });
      onSaved(data.row);
    } catch (e) {
      toast({ title: "ذخیره نشد", description: (e as Error).message, variant: "destructive" });
      setDraft(d => ({ ...d, ...Object.fromEntries(Object.keys(patch).map(k => [k, String((row as any)[k])])) }));
    } finally {
      setSaving(false);
    }
  };

  const cell = "px-1 py-1 align-middle";
  const text = "w-full bg-transparent outline-none rounded-md px-2 py-1.5 focus:bg-background focus:ring-2 focus:ring-primary/40";
  const readOnly = row.is_cancelled;

  return (
    <tr className={`border-b border-border/60 ${readOnly ? "opacity-50 line-through" : "hover:bg-muted/30"}`}>
      <td className={`${cell} text-center text-muted-foreground tabular-nums`}>
        {readOnly ? "—" : fa(index)}
        {saving && <Loader2 className="h-3 w-3 animate-spin inline mr-1" />}
      </td>
      <td className={`${cell} min-w-[150px]`}>
        <input
          className={`${text} font-medium`} value={draft.full_name} disabled={readOnly}
          onChange={e => setDraft({ ...draft, full_name: e.target.value })}
          onBlur={() => save({ full_name: draft.full_name })}
        />
        <div className="px-2 text-[10px] text-muted-foreground no-print">
          {row.is_cancelled ? "رزرو لغو شده" : row.is_manual ? "ثبت دستی" : `رزرو ${row.booking_code}`}
        </div>
      </td>
      <td className={`${cell} min-w-[120px]`}>
        <input
          className={`${text} tabular-nums`} dir="ltr" inputMode="tel" value={fa(draft.phone)} disabled={readOnly}
          onChange={e => setDraft({ ...draft, phone: toLatinDigits(e.target.value) })}
          onBlur={() => save({ phone: draft.phone })}
        />
      </td>
      <td className={`${cell} min-w-[120px]`}>
        <MoneyInput
          value={draft.paid} disabled={readOnly} className="text-emerald-700 font-semibold"
          onChange={v => setDraft({ ...draft, paid: v })}
          onCommit={() => save({ paid: parseMoney(draft.paid) })}
        />
      </td>
      <td className={`${cell} min-w-[120px]`}>
        <MoneyInput
          value={draft.cost} disabled={readOnly}
          onChange={v => setDraft({ ...draft, cost: v })}
          onCommit={() => save({ cost: parseMoney(draft.cost) })}
        />
      </td>
      <td className={`${cell} min-w-[110px] text-left tabular-nums font-bold px-3`} dir="ltr">
        {remaining > 0 && <span className="text-red-600">{money(remaining)}</span>}
        {remaining === 0 && <span className="text-emerald-600">تسویه ✓</span>}
        {remaining < 0 && <span className="text-sky-700" title="بیش از هزینه پرداخت کرده">{money(remaining)}+</span>}
      </td>
      <td className={`${cell} min-w-[250px]`}>
        {readOnly
          ? <span className="px-2 text-sm">{row.origin_display || "—"}</span>
          : <OriginPicker value={row.origin} options={origins} onPick={v => save({ origin: v })} />}
      </td>
      <td className={`${cell} min-w-[170px]`}>
        <input
          className={text} value={draft.notes} placeholder={readOnly ? "" : "—"} disabled={readOnly}
          onChange={e => setDraft({ ...draft, notes: e.target.value })}
          onBlur={() => save({ notes: draft.notes })}
        />
      </td>
      <td className={`${cell} w-10 no-print`}>
        {row.is_manual && !readOnly && (
          <button
            onClick={() => onDelete(row)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50"
            title="حذف این نفر"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </td>
    </tr>
  );
}

const EMPTY = { full_name: "", phone: "", cost: "", paid: "", notes: "", origin: "" };

export default function CaravanLedger({ params }: { params: { caravanId: string } }) {
  const caravanId = Number(params.caravanId);
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const key = ["leader-ledger", caravanId];
  const nameRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(EMPTY);
  const [adding, setAdding] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading, isError } = useQuery<Ledger>({
    queryKey: key,
    queryFn: () => api(`/api/leader/caravans/${caravanId}/ledger`),
    enabled: isAuthenticated && !Number.isNaN(caravanId),
  });

  // هزینه‌ی پیش‌فرض هر نفر = قیمت کاروان
  useEffect(() => {
    if (data && form.cost === "") setForm(f => ({ ...f, cost: String(data.caravan.price) }));
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const setRows = (fn: (rows: Row[]) => Row[], caravan?: Partial<Ledger["caravan"]>) =>
    qc.setQueryData<Ledger>(key, old => old && {
      ...old, rows: fn(old.rows), caravan: { ...old.caravan, ...(caravan || {}) },
    });

  const refreshElsewhere = () => {
    // ظرفیت عوض شده؛ داشبورد و صفحه‌های عمومی باید عدد تازه را ببینند
    qc.invalidateQueries({ queryKey: ["leader-caravans"] });
    qc.invalidateQueries({ queryKey: ["/api/caravans"] });
    qc.invalidateQueries({ queryKey: ["caravan-stats"] });
  };

  const add = async () => {
    if (form.full_name.trim().length < 2) {
      toast({ title: "نام و نام خانوادگی را بنویسید", variant: "destructive" });
      nameRef.current?.focus();
      return;
    }
    const cost = parseMoney(form.cost);
    const paid = parseMoney(form.paid);
    if (Number.isNaN(cost) || Number.isNaN(paid)) {
      toast({ title: "مبلغ‌ها باید عدد باشند", variant: "destructive" });
      return;
    }
    setAdding(true);
    try {
      const res = await api(`/api/leader/caravans/${caravanId}/ledger`, {
        method: "POST",
        body: JSON.stringify({ ...form, phone: toLatinDigits(form.phone), cost, paid }),
      });
      setRows(rows => [...rows.filter(r => !r.is_cancelled), res.row, ...rows.filter(r => r.is_cancelled)], res.caravan);
      refreshElsewhere();
      // مبدأ و هزینه برای نفر بعدی می‌مانند؛ معمولاً چند نفر پشت سر هم از یک شهرند
      setForm(f => ({ ...EMPTY, origin: f.origin, cost: f.cost }));
      nameRef.current?.focus();
    } catch (e) {
      toast({ title: "اضافه نشد", description: (e as Error).message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const remove = async (row: Row) => {
    if (!window.confirm(`«${row.full_name}» از دفتر حذف شود؟ یک نفر به ظرفیت کاروان برمی‌گردد.`)) return;
    try {
      const res = await api(`/api/leader/ledger/${row.id}`, { method: "DELETE" });
      setRows(rows => rows.filter(r => r.id !== row.id), res.caravan);
      refreshElsewhere();
    } catch (e) {
      toast({ title: "حذف نشد", description: (e as Error).message, variant: "destructive" });
    }
  };

  const exportCSV = async () => {
    setExporting(true);
    try {
      const res = await authFetch(`${djangoURL}/api/leader/caravans/${caravanId}/ledger/export`);
      if (!res.ok) throw new Error();
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `daftar-${caravanId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "دانلود انجام نشد", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); add(); }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-background min-h-screen">
        <Header solid />
        <div className="container pt-32 text-center text-muted-foreground">
          برای دیدن دفتر کاروان وارد حساب مدیر کاروان شوید.
        </div>
      </div>
    );
  }

  const t = totalsOf(data?.rows || []);
  let n = 0;
  const field = "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40";

  return (
    <div className="bg-background min-h-screen">
      <div className="no-print"><Header solid /></div>
      <div className="container max-w-7xl pt-28 pb-16">
        <button
          onClick={() => navigate("/leader/dashboard")}
          className="no-print flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-3"
        >
          <ArrowRight className="h-4 w-4" /> بازگشت به داشبورد
        </button>

        {isLoading && <div className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>}
        {isError && <div className="py-20 text-center text-muted-foreground">این کاروان پیدا نشد یا مال حساب شما نیست.</div>}

        {data && (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
              <div>
                <h1 className="font-heading text-2xl font-bold text-foreground">دفتر {data.caravan.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  حرکت {fa(data.caravan.departure_date)} · ظرفیت باقیمانده {fa(data.caravan.remaining_capacity)} از {fa(data.caravan.capacity)} نفر
                </p>
              </div>
              <div className="flex gap-2 no-print">
                <Button variant="outline" size="sm" className="rounded-xl gap-1" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" /> چاپ
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl gap-1" onClick={exportCSV} disabled={exporting}>
                  <Download className="h-4 w-4" /> اکسل
                </Button>
              </div>
            </div>

            {/* جمع‌ها — همیشه از روی ردیف‌ها، هیچ‌وقت دستی */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {[
                { label: "تعداد نفرات", value: `${fa(t.count)} نفر`, tone: "text-foreground" },
                { label: "جمع هزینه کاروان", value: `${money(t.cost)} تومان`, tone: "text-foreground" },
                { label: "جمع پرداخت‌شده", value: `${money(t.paid)} تومان`, tone: "text-emerald-700" },
                { label: "جمع الباقی", value: `${money(t.remaining)} تومان`, tone: t.remaining > 0 ? "text-red-600" : "text-emerald-700" },
              ].map(c => (
                <div key={c.label} className="bg-card border border-border rounded-2xl p-4">
                  <div className="text-xs text-muted-foreground mb-1">{c.label}</div>
                  <div className={`font-bold text-lg tabular-nums ${c.tone}`}>{c.value}</div>
                </div>
              ))}
            </div>

            {/* افزودن دستی — Enter می‌زند و نفر بعدی */}
            <div className="no-print bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-foreground flex items-center gap-1.5"><Plus className="h-4 w-4" /> افزودن زائر</h2>
                <span className="hidden sm:inline text-xs text-muted-foreground">بعد از هر نفر Enter بزنید؛ مبدأ و هزینه برای نفر بعد می‌ماند.</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
                <input ref={nameRef} className={`${field} lg:col-span-2`} placeholder="نام و نام خانوادگی *"
                  value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} onKeyDown={onEnter} />
                <input className={field} placeholder="شماره تماس" dir="ltr" inputMode="tel"
                  value={fa(form.phone)} onChange={e => setForm({ ...form, phone: toLatinDigits(e.target.value) })} onKeyDown={onEnter} />
                <div className={`${field} flex items-center gap-1`}>
                  <span className="text-xs text-muted-foreground shrink-0">پرداختی</span>
                  <MoneyInput value={form.paid} onChange={v => setForm({ ...form, paid: v })} onKeyDown={onEnter} placeholder="۰" />
                </div>
                <div className={`${field} flex items-center gap-1`}>
                  <span className="text-xs text-muted-foreground shrink-0">هزینه</span>
                  <MoneyInput value={form.cost} onChange={v => setForm({ ...form, cost: v })} onKeyDown={onEnter} />
                </div>
                <input className={field} placeholder="توضیحات"
                  value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} onKeyDown={onEnter} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">مبدأ:</span>
                  <OriginPicker size="md" value={form.origin} options={data.origins} onPick={v => setForm({ ...form, origin: v })} />
                </div>
                <Button onClick={add} disabled={adding || data.caravan.remaining_capacity <= 0} className="rounded-xl gap-1 min-w-[120px]">
                  {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {data.caravan.remaining_capacity <= 0 ? "ظرفیت تکمیل" : "افزودن"}
                </Button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    {["ردیف", "نام و نام خانوادگی", "شماره تماس", "مبلغ پرداخت شده", "هزینه کاروان", "الباقی مانده", "مبدا", "توضیحات", ""].map((h, i) => (
                      <th key={i} className={`px-3 py-3 font-semibold text-right whitespace-nowrap ${i === 8 ? "no-print" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.length === 0 && (
                    <tr><td colSpan={9} className="py-12 text-center text-muted-foreground">هنوز کسی در این کاروان نیست.</td></tr>
                  )}
                  {data.rows.map(r => (
                    <LedgerRow
                      key={r.id} row={r} index={r.is_cancelled ? 0 : ++n} origins={data.origins}
                      onSaved={saved => setRows(rows => rows.map(x => (x.id === saved.id ? saved : x)))}
                      onDelete={remove}
                    />
                  ))}
                </tbody>
                {data.rows.length > 0 && (
                  <tfoot className="bg-muted/40 font-bold">
                    <tr>
                      <td className="px-3 py-3" colSpan={3}>جمع — {fa(t.count)} نفر</td>
                      <td className="px-3 py-3 text-left tabular-nums text-emerald-700" dir="ltr">{money(t.paid)}</td>
                      <td className="px-3 py-3 text-left tabular-nums" dir="ltr">{money(t.cost)}</td>
                      <td className="px-3 py-3 text-left tabular-nums text-red-600" dir="ltr">{money(t.remaining)}</td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3 no-print">
              هر خانه را مستقیم ویرایش کنید؛ با بیرون آمدن از خانه ذخیره می‌شود. کسانی که از سایت یا ربات بله رزرو می‌کنند خودکار اینجا می‌آیند؛
              برای حذفشان رزرو را از داشبورد لغو کنید.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
