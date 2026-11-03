import { AlertTriangle } from "lucide-react";

import { EVALUATION_CATEGORY_META } from "@mediasync/shared";

import { StatusBadge } from "~/components/ui/status-badge";
import { initials } from "~/lib/utils";
import type { EvaluationMemberRow } from "~/server/queries/evaluations";

export function EvaluationTeamOverview({ rows }: { rows: EvaluationMemberRow[] }) {
  return (
    <section className="card-surface overflow-hidden">
      <div className="border-b border-cream-line px-5 py-4">
        <h2 className="text-base font-semibold text-ink">Ringkasan tim</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Hanya PM dan observer yang dapat melihat agregat seluruh anggota.
          Penilaian sejawat tetap anonim.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Anggota</th>
              <th className="text-center">Aktif /15</th>
              <th className="text-center">Disiplin /15</th>
              <th className="text-center">Total /30</th>
              <th>Kategori</th>
              <th>Kalibrasi</th>
              <th>Intervensi terakhir</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const evaluation = row.evaluation;
              const category = evaluation
                ? EVALUATION_CATEGORY_META[evaluation.category]
                : null;
              return (
                <tr key={row.member.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white"
                        style={{ backgroundColor: row.member.avatarColor }}
                      >
                        {initials(row.member.name)}
                      </span>
                      <div>
                        <p className="font-medium text-ink">{row.member.name}</p>
                        <p className="text-xs text-ink-muted">
                          {row.member.roleName}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="text-center tabular text-ink">
                    {evaluation?.activeScore ?? "—"}
                  </td>
                  <td className="text-center tabular text-ink">
                    {evaluation?.disciplineScore ?? "—"}
                  </td>
                  <td className="text-center tabular font-semibold text-ink">
                    {evaluation?.totalScore ?? "—"}
                  </td>
                  <td>
                    {category ? (
                      <StatusBadge tone={category.tone}>{category.label}</StatusBadge>
                    ) : (
                      <span className="text-xs text-ink-muted">Belum dinilai</span>
                    )}
                  </td>
                  <td>
                    {row.calibration ? (
                      <span
                        className="inline-flex items-center gap-1 text-xs font-semibold text-status-doing-text"
                        title="Rata-rata nilai sejawat berbeda lebih dari 1,5 poin dari sinyal objektif tugas."
                      >
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                        Perlu kalibrasi
                      </span>
                    ) : (
                      <span className="text-xs text-ink-muted">
                        {row.objectiveSignal !== null
                          ? `Sinyal objektif ${row.objectiveSignal.toFixed(1)}/5`
                          : "Belum ada data"}
                      </span>
                    )}
                  </td>
                  <td className="text-xs text-ink-muted">
                    {row.latestIntervention ? (
                      <span className="font-medium text-ink">
                        {row.latestIntervention.stepLabel}
                      </span>
                    ) : (
                      "Belum ada"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
