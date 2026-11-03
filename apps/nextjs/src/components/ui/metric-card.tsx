import { cn } from "~/lib/utils";

export function MetricCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "done" | "doing" | "blocked";
  icon?: React.ReactNode;
}) {
  const valueTone = {
    neutral: "text-ink",
    done: "text-status-done-text",
    doing: "text-status-doing-text",
    blocked: "text-status-blocked-text",
  }[tone];

  return (
    <div className="card-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {label}
        </p>
        {icon ? <span className="text-forest">{icon}</span> : null}
      </div>
      <p className={cn("mt-2 text-2xl font-bold tabular leading-8", valueTone)}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}
