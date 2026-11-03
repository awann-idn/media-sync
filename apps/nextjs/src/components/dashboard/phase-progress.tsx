import type { DashboardData } from "~/server/queries/dashboard";

export function PhaseProgress({
  phases,
}: {
  phases: DashboardData["phaseProgress"];
}) {
  return (
    <section className="card-surface p-4 sm:p-5">
      <h2 className="font-heading text-base font-bold text-ink">
        Progres per fase
      </h2>
      <p className="mt-0.5 text-xs text-ink-muted">
        Penyelesaian tugas pada tiap tahap produksi.
      </p>

      <div className="mt-4 space-y-4">
        {phases.map((phase) => {
          const ratio = phase.total > 0 ? phase.completed / phase.total : 0;
          return (
            <div key={phase.phase}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-ink">{phase.label}</span>
                <span className="tabular text-ink-muted">
                  {phase.completed}/{phase.total} selesai
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-cream-line/60">
                <div
                  className="h-full rounded-full bg-forest transition-[width]"
                  style={{ width: `${Math.round(ratio * 100)}%` }}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={phase.total}
                  aria-valuenow={phase.completed}
                  aria-label={`${phase.label}: ${phase.completed} dari ${phase.total}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
