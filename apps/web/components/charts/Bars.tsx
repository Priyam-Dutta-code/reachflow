/** Hand-rolled SVG bar chart on tokens (Appendix E #8 — no chart lib). */
export function Bars({
  data,
  height = 160,
  ariaLabel,
}: {
  data: { label: string; value: number }[];
  height?: number;
  ariaLabel: string;
}) {
  if (data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.value), 1);
  const barWidth = 100 / data.length;
  const gap = Math.min(barWidth * 0.25, 1.5);

  return (
    <figure aria-label={ariaLabel} role="img">
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        className="h-40 w-full"
      >
        {data.map((d, index) => {
          const barHeight = Math.max((d.value / max) * (height - 24), d.value > 0 ? 4 : 1.5);
          return (
            <rect
              key={d.label}
              x={index * barWidth + gap / 2}
              y={height - barHeight}
              width={barWidth - gap}
              height={barHeight}
              rx={1}
              className={d.value > 0 ? "fill-accent" : "fill-line"}
            >
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex justify-between font-mono text-[10px] text-muted">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </figcaption>
    </figure>
  );
}
