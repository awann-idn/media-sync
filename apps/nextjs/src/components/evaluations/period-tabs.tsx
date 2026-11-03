import Link from "next/link";

import { EVALUATION_PERIOD_META } from "@mediasync/shared";

import { cn } from "~/lib/utils";
import {
  EVALUATION_PERIODS,
  type EvaluationPeriodKey,
} from "~/server/queries/evaluations";

export function EvaluationPeriodTabs({
  active,
}: {
  active: EvaluationPeriodKey;
}) {
  return (
    <nav
      aria-label="Periode evaluasi"
      className="flex flex-wrap gap-1.5 rounded-lg border border-cream-line bg-cream-card p-1.5"
    >
      {EVALUATION_PERIODS.map((period) => (
        <Link
          key={period}
          href={`/evaluations?period=${period}`}
          aria-current={period === active ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-2 text-xs font-semibold transition-colors",
            period === active
              ? "bg-forest text-cream-card"
              : "text-ink-muted hover:bg-forest-50 hover:text-forest",
          )}
        >
          {EVALUATION_PERIOD_META[period]}
        </Link>
      ))}
    </nav>
  );
}
