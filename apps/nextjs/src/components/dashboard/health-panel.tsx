import { Activity } from "lucide-react";

import type { HealthResult } from "@mediasync/shared";

import { cn } from "~/lib/utils";

const components = [
  {
    key: "onTime",
    label: "Ketepatan waktu",
    weight: "35%",
    className: "bg-status-done-solid",
  },
  {
    key: "participation",
    label: "Partisipasi",
    weight: "25%",
    className: "bg-status-review-solid",
  },
  {
    key: "decisionStability",
    label: "Stabilitas keputusan",
    weight: "20%",
    className: "bg-status-doing-solid",
  },
  {
    key: "docCompliance",
    label: "Kelengkapan dokumentasi",
    weight: "20%",
    className: "bg-forest",
  },
] as const;

const toneText = {
  done: "text-status-done-text",
  doing: "text-status-doing-text",
  blocked: "text-status-blocked-text",
};

const toneBg = {
  done: "bg-status-done-soft",
  doing: "bg-status-doing-soft",
  blocked: "bg-status-blocked-soft",
};

export function HealthPanel({ health }: { health: HealthResult }) {
  return (
    <section className="card-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-bold text-ink">
            Kesehatan proyek
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Indeks gabungan indikator objektif.
          </p>
        </div>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
            toneBg[health.tone],
            toneText[health.tone],
          )}
        >
          <Activity className="h-3.5 w-3.5" aria-hidden />
          {health.label}
        </span>
      </div>

      <div className="mt-3 flex items-end gap-2">
        <span
          className={cn(
            "text-4xl font-bold leading-none tabular",
            toneText[health.tone],
          )}
        >
          {health.score}
        </span>
        <span className="pb-0.5 text-xs text-ink-muted">/ 100</span>
      </div>

      <dl className="mt-4 space-y-2.5">
        {components.map((component) => {
          const value = health.components[component.key];
          return (
            <div key={component.key}>
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <dt className="font-medium text-ink">{component.label}</dt>
                <dd className="tabular text-ink-muted">
                  {Math.round(value * 100)}% · bobot {component.weight}
                </dd>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cream-line/60">
                <div
                  className={cn("h-full rounded-full", component.className)}
                  style={{ width: `${Math.round(value * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </dl>

      <p className="mt-3 text-[10px] leading-4 text-ink-muted">
        Sehat ≥ 75 · Waspada 50–74 · Kritis &lt; 50.
      </p>
    </section>
  );
}
