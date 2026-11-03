import { AlertTriangle } from "lucide-react";

import { initials } from "~/lib/utils";
import type { DashboardData } from "~/server/queries/dashboard";

const SEGMENTS = [
  { key: "done", label: "Selesai", className: "bg-status-done-solid" },
  { key: "doing", label: "Dikerjakan", className: "bg-status-doing-solid" },
  { key: "review", label: "Review", className: "bg-status-review-solid" },
  { key: "blocked", label: "Terhambat", className: "bg-status-blocked-solid" },
  { key: "idle", label: "Belum mulai", className: "bg-status-idle-solid/60" },
] as const;

export function ContributionStrip({
  contributions,
}: {
  contributions: DashboardData["contributions"];
}) {
  return (
    <div className="card-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-bold text-ink">
            Kontribusi anggota
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Distribusi tugas berdasarkan status, bukan papan peringkat.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {contributions.map((item) => (
          <div
            key={item.member.id}
            className="rounded-lg border border-cream-line bg-cream/40 p-3"
          >
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: item.member.avatarColor }}
              >
                {initials(item.member.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {item.member.name}
                </p>
                <p className="truncate text-[11px] text-ink-muted">
                  {item.member.role.name} · {item.done}/{item.total} tugas selesai
                </p>
              </div>
              {item.risk > 0 ? (
                <span
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-status-blocked-soft px-1.5 py-0.5 text-[10px] font-semibold text-status-blocked-text"
                  title={`${item.risk} tugas berisiko`}
                >
                  <AlertTriangle className="h-3 w-3" aria-hidden />
                  {item.risk}
                </span>
              ) : null}
            </div>

            {item.total === 0 ? (
              <p className="mt-2 text-[11px] text-ink-muted">
                Belum ada tugas yang ditugaskan.
              </p>
            ) : (
              <div
                className="mt-2.5 flex h-2 overflow-hidden rounded-full bg-cream-line/50"
                role="img"
                aria-label={`${item.member.name}: ${item.done} selesai dari ${item.total} tugas`}
              >
                {SEGMENTS.map((segment) => {
                  const count = item[segment.key];
                  if (count === 0) return null;
                  return (
                    <span
                      key={segment.key}
                      className={segment.className}
                      style={{ width: `${(count / item.total) * 100}%` }}
                      title={`${segment.label}: ${count}`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-ink-muted">
        {SEGMENTS.map((segment) => (
          <span key={segment.key} className="inline-flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${segment.className}`} />
            {segment.label}
          </span>
        ))}
      </div>
    </div>
  );
}
