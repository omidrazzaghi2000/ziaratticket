import { motion } from "framer-motion";

/** انواع اتوبوس‌های موجود کاروان‌ها */
export const BUS_TYPES = [25, 32, 44] as const;
export type BusType = (typeof BUS_TYPES)[number];

const DEFAULT_BUS_TYPE: BusType = 44;

function toPersian(num: number) {
  const d = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num.toString().replace(/\d/g, (x) => d[parseInt(x)]);
}

/**
 * مشخصات چیدمان هر نوع اتوبوس:
 *  - ۲۵ و ۳۲ نفره: چیدمان ۲+۱ (VIP)
 *  - ۴۴ نفره: چیدمان ۲+۲ (معمولی)
 * `rightCols` تعداد صندلی سمت راست راهرو و `leftCols` سمت چپ راهرو است.
 */
const LAYOUTS: Record<number, { rightCols: number; leftCols: number; label: string }> = {
  25: { rightCols: 2, leftCols: 1, label: "۲۵ نفره (VIP ۲+۱)" },
  32: { rightCols: 2, leftCols: 1, label: "۳۲ نفره (۲+۱)" },
  44: { rightCols: 2, leftCols: 2, label: "۴۴ نفره (۲+۲)" },
};

function layoutFor(busType: number) {
  return LAYOUTS[busType] || LAYOUTS[DEFAULT_BUS_TYPE];
}

type BusRow =
  | { type: "seats"; right: (number | null)[]; left: (number | null)[] }
  | { type: "divider" };

/**
 * ساخت ردیف‌های یک اتوبوس. صندلی‌ها از راست به چپ و از جلو به عقب شماره‌گذاری
 * می‌شوند و شماره‌ها در کل کاروان (چند اتوبوس) پیوسته‌اند.
 */
export function generateBusRows(
  busIndex: number,
  busType: number,
  totalCapacity: number
): BusRow[] {
  const { rightCols, leftCols } = layoutFor(busType);
  const perRow = rightCols + leftCols;
  const offset = busIndex * busType;
  // صندلی‌های واقعی این اتوبوس (اتوبوس آخر ممکن است پر نشود)
  const seatsInThisBus = Math.max(0, Math.min(busType, totalCapacity - offset));
  const rowCount = Math.ceil(seatsInThisBus / perRow);
  const dividerAfter = Math.floor(rowCount / 2);

  const rows: BusRow[] = [];
  let counter = 0;
  const next = (): number | null => {
    counter += 1;
    return counter <= seatsInThisBus ? offset + counter : null;
  };

  for (let r = 0; r < rowCount; r++) {
    const isLastRow = r === rowCount - 1;
    const remaining = seatsInThisBus - counter;

    if (isLastRow && remaining === 1) {
      // صندلی تکِ ردیف آخر روبه‌روی درب وسط اتوبوس است، نه کنار پنجره؛
      // پس در ستون وسط (کنار راهرو) نشانده می‌شود.
      const right: (number | null)[] = Array(rightCols).fill(null);
      const left: (number | null)[] = Array(leftCols).fill(null);
      right[rightCols - 1] = next();
      rows.push({ type: "seats", right, left });
    } else {
      const right = Array.from({ length: rightCols }, next);
      const left = Array.from({ length: leftCols }, next);
      rows.push({ type: "seats", right, left });
    }

    if (r === dividerAfter - 1) rows.push({ type: "divider" });
  }
  return rows;
}

interface SeatButtonProps {
  seatNum: number | null;
  occupied: boolean;
  selected: boolean;
  disabled: boolean;
  onToggle: (n: number) => void;
}

function SeatButton({ seatNum, occupied, selected, disabled, onToggle }: SeatButtonProps) {
  if (seatNum === null) {
    return <div className="w-9 h-10" aria-hidden />;
  }

  const base =
    "w-9 h-10 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold border-2 transition-all select-none";
  const style = occupied
    ? `${base} bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed`
    : selected
    ? `${base} bg-primary border-primary text-white shadow-md`
    : `${base} bg-white border-border text-muted-foreground hover:border-primary hover:text-primary cursor-pointer`;

  return (
    <motion.button
      type="button"
      whileHover={!occupied && !disabled ? { scale: 1.08 } : {}}
      whileTap={!occupied && !disabled ? { scale: 0.93 } : {}}
      disabled={occupied || (disabled && !selected)}
      aria-pressed={selected}
      aria-label={occupied ? `صندلی ${toPersian(seatNum)} اشغال شده` : `صندلی ${toPersian(seatNum)}`}
      onClick={() => !occupied && onToggle(seatNum)}
      className={style}
      title={occupied ? "اشغال شده" : `صندلی ${toPersian(seatNum)}`}
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4 mb-0.5" fill="currentColor">
        <path d="M5 13V7a1 1 0 0 1 2 0v6h10V7a1 1 0 0 1 2 0v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Zm1 3h12v1a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-1Z" />
      </svg>
      <span>{toPersian(seatNum)}</span>
    </motion.button>
  );
}

interface BusProps {
  busIndex: number;
  busNumber: number;
  busType: number;
  totalCapacity: number;
  occupiedSeats: Set<number>;
  selectedSeats: number[];
  maxSelectable: number;
  showBusNumber: boolean;
  onToggle: (n: number) => void;
}

function Bus({
  busIndex,
  busNumber,
  busType,
  totalCapacity,
  occupiedSeats,
  selectedSeats,
  maxSelectable,
  showBusNumber,
  onToggle,
}: BusProps) {
  const rows = generateBusRows(busIndex, busType, totalCapacity);
  const canSelectMore = selectedSeats.length < maxSelectable;
  const seatCount = rows.reduce(
    (n, r) => (r.type === "seats" ? n + [...r.right, ...r.left].filter(s => s !== null).length : n),
    0
  );

  return (
    <div className="flex flex-col items-center">
      <p className="text-xs font-bold text-primary mb-2">
        {showBusNumber ? `اتوبوس ${toPersian(busNumber)} — ` : ""}
        {toPersian(seatCount)} صندلی
      </p>

      <div className="bg-gradient-to-b from-slate-100 to-slate-50 border-2 border-slate-300 rounded-[28px] p-3 shadow-md inline-flex flex-col items-center gap-1.5">
        {/* Driver */}
        <div className="w-full flex justify-center mb-1">
          <div className="bg-slate-300 rounded-lg px-3 py-1 flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7H4Z" />
            </svg>
            راننده
          </div>
        </div>

        {rows.map((row, i) => {
          if (row.type === "divider") {
            return (
              <div key={i} className="w-full flex items-center gap-1 my-0.5">
                <div className="flex-1 h-px bg-slate-400" />
                <span className="text-[8px] text-slate-500 font-bold whitespace-nowrap">درب وسط اتوبوس</span>
                <div className="flex-1 h-px bg-slate-400" />
              </div>
            );
          }

          const seatBtn = (seatNum: number | null, key: string) => (
            <SeatButton
              key={key}
              seatNum={seatNum}
              occupied={seatNum !== null && occupiedSeats.has(seatNum)}
              selected={seatNum !== null && selectedSeats.includes(seatNum)}
              disabled={!canSelectMore}
              onToggle={onToggle}
            />
          );

          return (
            <div key={i} className="flex items-center gap-1">
              {/* در چیدمان RTL، فرزندان ابتدایی سمت راست قرار می‌گیرند */}
              {row.right.map((s, j) => seatBtn(s, `r${j}`))}
              {/* راهرو */}
              <div className="w-3" />
              {row.left.map((s, j) => seatBtn(s, `l${j}`))}
            </div>
          );
        })}

        {/* Back of bus */}
        <div className="w-full flex justify-center mt-1">
          <div className="bg-slate-300 rounded-b-xl px-4 py-0.5 text-[9px] font-bold text-slate-500">عقب</div>
        </div>
      </div>
    </div>
  );
}

interface BusSeatMapProps {
  /** ظرفیت کل کاروان (ممکن است چند اتوبوس باشد) */
  totalCapacity: number;
  /** نوع اتوبوس تعیین‌شده توسط کاروان: ۲۵ / ۳۲ / ۴۴ */
  busType?: number;
  occupiedSeats: number[];
  selectedSeats: number[];
  maxSelectable: number;
  onToggle: (seatNum: number) => void;
}

export default function BusSeatMap({
  totalCapacity,
  busType = DEFAULT_BUS_TYPE,
  occupiedSeats,
  selectedSeats,
  maxSelectable,
  onToggle,
}: BusSeatMapProps) {
  const type = LAYOUTS[busType] ? busType : DEFAULT_BUS_TYPE;
  const capacity = Math.max(1, totalCapacity || type);
  const busCount = Math.max(1, Math.ceil(capacity / type));
  const occupiedSet = new Set(occupiedSeats);

  return (
    <div dir="rtl" className="space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded border-2 border-border bg-white" />
          <span className="text-muted-foreground">خالی</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded border-2 border-primary bg-primary" />
          <span className="text-muted-foreground">انتخاب شده</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded border-2 border-gray-300 bg-gray-200" />
          <span className="text-muted-foreground">اشغال شده</span>
        </div>
        <span className="text-muted-foreground mr-auto">چیدمان: {layoutFor(type).label}</span>
      </div>

      {/* Buses */}
      <div className="flex flex-wrap gap-8 justify-center overflow-x-auto">
        {Array.from({ length: busCount }, (_, i) => (
          <Bus
            key={i}
            busIndex={i}
            busNumber={i + 1}
            busType={type}
            totalCapacity={capacity}
            occupiedSeats={occupiedSet}
            selectedSeats={selectedSeats}
            maxSelectable={maxSelectable}
            showBusNumber={busCount > 1}
            onToggle={onToggle}
          />
        ))}
      </div>

      <p className="text-center text-sm font-medium text-primary">
        {toPersian(selectedSeats.length)} از {toPersian(maxSelectable)} صندلی انتخاب شده
        {selectedSeats.length > 0 && (
          <span className="text-muted-foreground font-normal">
            {" "}— شماره صندلی: {selectedSeats.slice().sort((a, b) => a - b).map(toPersian).join("، ")}
          </span>
        )}
      </p>
    </div>
  );
}
