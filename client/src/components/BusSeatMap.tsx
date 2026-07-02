import { motion } from "framer-motion";

const SEATS_PER_BUS = 25;

function toPersian(num: number) {
  const d = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return num.toString().replace(/\d/g, (x) => d[parseInt(x)]);
}

type BusRow =
  | { type: "seats"; left: number | null; mid: number | null; right: number | null }
  | { type: "divider" };

function generateBusRows(busIndex: number, totalCapacity: number): BusRow[] {
  const offset = busIndex * SEATS_PER_BUS;
  const seat = (n: number): number | null => {
    const num = offset + n;
    return num <= totalCapacity ? num : null;
  };
  return [
    { type: "seats", left: seat(3),  mid: seat(2),  right: seat(1)  },
    { type: "seats", left: seat(6),  mid: seat(5),  right: seat(4)  },
    { type: "seats", left: seat(9),  mid: seat(8),  right: seat(7)  },
    { type: "seats", left: seat(12), mid: seat(11), right: seat(10) },
    { type: "divider" },
    { type: "seats", left: seat(13), mid: null,     right: null     },
    { type: "seats", left: seat(16), mid: seat(15), right: seat(14) },
    { type: "seats", left: seat(19), mid: seat(18), right: seat(17) },
    { type: "seats", left: seat(22), mid: seat(21), right: seat(20) },
    { type: "seats", left: seat(25), mid: seat(24), right: seat(23) },
  ];
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
    return <div className="w-9 h-10" />;
  }

  const base = "w-9 h-10 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold border-2 transition-all select-none";
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
  totalCapacity: number;
  occupiedSeats: Set<number>;
  selectedSeats: number[];
  maxSelectable: number;
  onToggle: (n: number) => void;
}

function Bus({ busIndex, busNumber, totalCapacity, occupiedSeats, selectedSeats, maxSelectable, onToggle }: BusProps) {
  const rows = generateBusRows(busIndex, totalCapacity);
  const canSelectMore = selectedSeats.length < maxSelectable;

  return (
    <div className="flex flex-col items-center">
      <p className="text-xs font-bold text-primary mb-2">
        اتوبوس {toPersian(busNumber)}
      </p>

      <div className="bg-gradient-to-b from-slate-100 to-slate-50 border-2 border-slate-300 rounded-[28px] p-3 shadow-md inline-flex flex-col items-center gap-1.5 min-w-[132px]">
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
                <span className="text-[8px] text-slate-500 font-bold whitespace-nowrap">خروج اضطراری</span>
                <div className="flex-1 h-px bg-slate-400" />
              </div>
            );
          }

          return (
            <div key={i} className="flex items-center gap-1">
              {/* Right double seats — in RTL flex, first children are on the RIGHT visually */}
              <SeatButton
                seatNum={row.right}
                occupied={row.right !== null && occupiedSeats.has(row.right)}
                selected={row.right !== null && selectedSeats.includes(row.right)}
                disabled={!canSelectMore}
                onToggle={onToggle}
              />
              <SeatButton
                seatNum={row.mid}
                occupied={row.mid !== null && occupiedSeats.has(row.mid)}
                selected={row.mid !== null && selectedSeats.includes(row.mid)}
                disabled={!canSelectMore}
                onToggle={onToggle}
              />

              {/* Aisle */}
              <div className="w-3" />

              {/* Left single seat — last child is on the LEFT in RTL flex */}
              <SeatButton
                seatNum={row.left}
                occupied={row.left !== null && occupiedSeats.has(row.left)}
                selected={row.left !== null && selectedSeats.includes(row.left)}
                disabled={!canSelectMore}
                onToggle={onToggle}
              />
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
  totalCapacity: number;
  occupiedSeats: number[];
  selectedSeats: number[];
  maxSelectable: number;
  onToggle: (seatNum: number) => void;
}

export default function BusSeatMap({
  totalCapacity,
  occupiedSeats,
  selectedSeats,
  maxSelectable,
  onToggle,
}: BusSeatMapProps) {
  const busCount = Math.ceil(totalCapacity / SEATS_PER_BUS);
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
      </div>

      {/* Buses */}
      <div className="flex flex-wrap gap-8 justify-center">
        {Array.from({ length: busCount }, (_, i) => (
          <Bus
            key={i}
            busIndex={i}
            busNumber={i + 1}
            totalCapacity={totalCapacity}
            occupiedSeats={occupiedSet}
            selectedSeats={selectedSeats}
            maxSelectable={maxSelectable}
            onToggle={onToggle}
          />
        ))}
      </div>

      <p className="text-center text-sm font-medium text-primary">
        {toPersian(selectedSeats.length)} از {toPersian(maxSelectable)} صندلی انتخاب شده
      </p>
    </div>
  );
}
