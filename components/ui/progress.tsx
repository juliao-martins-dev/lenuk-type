import { cn } from "@/lib/utils";

export function Progress({ value = 0, className }: { value?: number; className?: string }) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Number(clampedValue.toFixed(1))}
      aria-valuetext={`${Math.round(clampedValue)}%`}
    >
      <div className="h-full bg-primary transition-all" style={{ width: `${clampedValue}%` }} />
    </div>
  );
}
