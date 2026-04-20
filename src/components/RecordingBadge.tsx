import { Circle } from "lucide-react";

interface Props {
  variant?: "default" | "full";
}

/**
 * Индикатор записи действий — юридически уведомляет ученика.
 */
export default function RecordingBadge({ variant = "default" }: Props) {
  if (variant === "full") {
    return (
      <div className="fixed top-3 right-3 z-50 flex flex-col gap-0.5 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs font-medium text-destructive shadow-sm backdrop-blur max-w-[280px]">
        <div className="flex items-center gap-2">
          <Circle className="h-2 w-2 fill-destructive text-destructive animate-pulse" />
          <span>Идёт запись действий</span>
        </div>
        <span className="text-[10px] opacity-80 leading-tight">
          Контроль копирования, переключений вкладок и горячих клавиш
        </span>
      </div>
    );
  }
  return (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-2 rounded-full bg-destructive/10 border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive shadow-sm backdrop-blur">
      <Circle className="h-2 w-2 fill-destructive text-destructive animate-pulse" />
      <span>Идёт запись действий</span>
    </div>
  );
}
