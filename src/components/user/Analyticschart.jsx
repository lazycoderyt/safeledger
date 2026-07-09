"use client";

/**
 * components/user/AnalyticsCharts.jsx
 * Two lightweight, dependency-free chart components for the analytics
 * page: a horizontal category-breakdown bar list, and a grouped
 * monthly credit/debit bar chart. Both are pure Tailwind + inline
 * `style` widths/heights driven entirely by the numbers passed in —
 * no chart library, and no values invented here.
 */

const CATEGORY_COLORS = [
  "bg-blue-600",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-slate-500",
];

function formatCurrency(value) {
  const amount = Number.isFinite(value) ? value : 0;
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function CategoryBreakdownChart({ categories, grandTotal }) {
  if (!categories.length) {
    return (
      <p className="py-8 text-center text-sm text-slate-400">
        No categorized spending yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {categories.map((item, index) => {
        const percent =
          grandTotal > 0 ? Math.round((item.total / grandTotal) * 100) : 0;
        const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
        return (
          <div key={item.category}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium text-slate-700">
                {item.category === "Admin Adjustment"
                  ? "Credits"
                  : item.category}
              </span>
              <span className="font-mono text-xs text-slate-500">
                {formatCurrency(item.total)} · {percent}%
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${color} transition-all duration-500`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MonthlyTrendChart({ months }) {
  const maxValue = Math.max(1, ...months.flatMap((m) => [m.credits, m.debits]));
  const allZero = months.every((m) => m.credits === 0 && m.debits === 0);

  return (
    <div>
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full bg-emerald-500"
            aria-hidden="true"
          />
          Credits
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full bg-slate-700"
            aria-hidden="true"
          />
          Debits
        </span>
      </div>

      {allZero ? (
        <p className="py-8 text-center text-sm text-slate-400">
          No activity in this period yet.
        </p>
      ) : (
        <div className="mt-4 flex h-48 items-end justify-between gap-2 sm:gap-4">
          {months.map((month) => {
            const creditHeight = Math.round((month.credits / maxValue) * 100);
            const debitHeight = Math.round((month.debits / maxValue) * 100);
            return (
              <div
                key={month.key}
                className="flex flex-1 flex-col items-center gap-2"
              >
                <div className="flex h-40 w-full items-end justify-center gap-1">
                  <div
                    title={`Credits: ${formatCurrency(month.credits)}`}
                    className="w-full max-w-[14px] rounded-t-sm bg-emerald-500 transition-all duration-500"
                    style={{ height: `${creditHeight}%` }}
                  />
                  <div
                    title={`Debits: ${formatCurrency(month.debits)}`}
                    className="w-full max-w-[14px] rounded-t-sm bg-slate-700 transition-all duration-500"
                    style={{ height: `${debitHeight}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-slate-500 whitespace-nowrap">
                  {month.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
