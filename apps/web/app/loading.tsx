export default function RootLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg">
      <div className="flex items-center gap-3 text-sm text-muted" role="status" aria-live="polite">
        <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
        Loading…
      </div>
    </div>
  );
}
