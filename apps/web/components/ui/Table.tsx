import type { ReactNode } from "react";

import { cn } from "./cn";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** hide this column in the mobile card view */
  hideOnCards?: boolean;
};

/**
 * Data table that becomes stacked cards below `md` (master plan: every table
 * becomes cards on mobile). Pass `getRowKey` for stable keys.
 */
export function Table<T>({
  columns,
  rows,
  getRowKey,
  emptyState,
  className,
}: {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string | number;
  emptyState?: ReactNode;
  className?: string;
}) {
  if (rows.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={className}>
      {/* desktop */}
      <div className="hidden overflow-hidden rounded-card border border-line bg-surface md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-line bg-bg text-xs font-medium uppercase tracking-wide text-muted">
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className="px-4 py-3 font-medium">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={getRowKey(row)}
                className="border-b border-line text-ink-soft transition-colors last:border-b-0 hover:bg-bg"
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 align-middle">
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* mobile cards */}
      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li key={getRowKey(row)} className="rounded-card border border-line bg-surface p-4">
            <dl className="space-y-2.5">
              {columns
                .filter((column) => !column.hideOnCards)
                .map((column) => (
                  <div key={column.key} className={cn("flex items-start justify-between gap-4")}>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                      {column.header}
                    </dt>
                    <dd className="min-w-0 text-right text-sm text-ink">{column.render(row)}</dd>
                  </div>
                ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
