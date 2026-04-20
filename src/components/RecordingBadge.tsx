import { Circle } from "lucide-react";

/**
 * Индикатор записи действий — юридически уведомляет ученика.
 */
export default function RecordingBadge() {
  return (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-2 rounded-full bg-destructive/10 border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive shadow-sm backdrop-blur">
      <Circle className="h-2 w-2 fill-destructive text-destructive animate-pulse" />
      <span>Идёт запись действий</span>
    </div>
  );
}
