import { cn } from "./cn";

/** Quota/progress bar. Warns visually at 80%, alerts at 100%. */
export function ProgressMeter({
  value,
  max,
  label,
  className,
}: {
  value: number;
  max: number;
  label?: string;
  className?: string;
}) {
  const safeMax = Math.max(max, 1);
  const ratio = Math.min(Math.max(value / safeMax, 0), 1);
  const tone =
    ratio >= 1 ? "bg-danger" : ratio >= 0.8 ? "bg-warning" : "bg-accent";

  return (
    <div className={className}>
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
          <span className="font-medium text-ink-soft">{label}</span>
          <span className="font-mono text-xs text-muted">
            {value}/{max}
          </span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-label={label}
        className="h-2 overflow-hidden rounded-full bg-line/70"
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-300", tone)}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
