import { cn } from "./cn";

function Shimmer({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-control bg-line/60", className)} aria-hidden="true" />;
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2.5", className)} role="status" aria-label="Loading">
      {Array.from({ length: lines }).map((_, index) => (
        <Shimmer key={index} className={cn("h-4", index === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded-card border border-line bg-surface p-5", className)}
      role="status"
      aria-label="Loading"
    >
      <Shimmer className="h-4 w-1/3" />
      <Shimmer className="mt-3 h-8 w-1/2" />
      <Shimmer className="mt-3 h-4 w-full" />
    </div>
  );
}

export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 py-3", className)} role="status" aria-label="Loading">
      <Shimmer className="h-9 w-9 rounded-full" />
      <div className="flex-1 space-y-2">
        <Shimmer className="h-4 w-1/3" />
        <Shimmer className="h-3 w-1/2" />
      </div>
      <Shimmer className="h-6 w-16" />
    </div>
  );
}
