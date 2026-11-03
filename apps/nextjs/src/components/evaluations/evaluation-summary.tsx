import { MessageSquareQuote } from "lucide-react";

import {
  EVALUATION_CATEGORY_META,
  INDICATORS,
  type EvaluationCategory,
} from "@mediasync/shared";

import { INDICATOR_META } from "~/components/evaluations/constants";
import { StatusBadge } from "~/components/ui/status-badge";
import { initials } from "~/lib/utils";
import type { EvaluationMemberRow } from "~/server/queries/evaluations";

const ADVICE: Record<EvaluationCategory, string> = {
  EXCELLENT:
    "Pertahankan kontribusi dan bagikan cara kerja yang membantu tim. Tidak ada tindakan khusus yang diperlukan.",
  MODERATE:
    "Diskusikan prioritas dan hambatan pada cek kondisi rutin. Dukungan kecil biasanya cukup untuk menaikkan skor.",
  INTERVENTION_NEEDED:
    "Lakukan cek kondisi untuk mencari penyebab, bukan langsung memberi sanksi. Sesuaikan beban atau peran sebelum mempertimbangkan peringatan formal.",
};

export function EvaluationSummaryCard({
  row,
  showIdentity = false,
  showSelfNote = false,
}: {
  row: EvaluationMemberRow;
  showIdentity?: boolean;
  showSelfNote?: boolean;
}) {
  const evaluation = row.evaluation;
  if (!evaluation) {
    return (
      <section className="card-surface p-5">
        {showIdentity ? (
          <div className="mb-3 flex items-center gap-2.5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{ backgroundColor: row.member.avatarColor }}
            >
              {initials(row.member.name)}
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">{row.member.name}</p>
              <p className="text-xs text-ink-muted">{row.member.roleName}</p>
            </div>
          </div>
        ) : null}
        <p className="text-sm text-ink-muted">
          Belum ada penilaian pada periode ini.
        </p>
      </section>
    );
  }

  const category = EVALUATION_CATEGORY_META[evaluation.category];

  return (
    <section className="card-surface p-5">
      {showIdentity ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: row.member.avatarColor }}
            >
              {initials(row.member.name)}
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">{row.member.name}</p>
              <p className="text-xs text-ink-muted">
                {row.member.roleName}
                {row.member.secondaryRoleName
                  ? ` · cadangan ${row.member.secondaryRoleName}`
                  : ""}
              </p>
            </div>
          </div>
          <StatusBadge tone={category.tone}>{category.label}</StatusBadge>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            Skor total
          </p>
          <p className="mt-0.5 font-heading text-3xl font-bold text-ink">
            {evaluation.totalScore}
            <span className="ml-1 text-sm font-medium text-ink-muted">/ 30</span>
          </p>
        </div>
        {!showIdentity ? (
          <StatusBadge tone={category.tone}>{category.label}</StatusBadge>
        ) : null}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg bg-forest-50 px-3 py-2">
            <p className="font-semibold text-forest">Aktif</p>
            <p className="mt-0.5 text-sm font-bold text-ink">
              {evaluation.activeScore}
              <span className="text-[11px] font-medium text-ink-muted">/15</span>
            </p>
          </div>
          <div className="rounded-lg bg-cream px-3 py-2">
            <p className="font-semibold text-ink-muted">Disiplin</p>
            <p className="mt-0.5 text-sm font-bold text-ink">
              {evaluation.disciplineScore}
              <span className="text-[11px] font-medium text-ink-muted">/15</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Indikator</th>
              <th className="text-center">Sejawat</th>
              <th className="text-center">Diri</th>
              <th className="text-center">Final</th>
            </tr>
          </thead>
          <tbody>
            {INDICATORS.map((indicator) => {
              const score = evaluation.indicators.find(
                (item) => item.indicator === indicator,
              );
              return (
                <tr key={indicator}>
                  <td>
                    <span className="mr-1.5 font-mono text-[10px] font-semibold text-forest">
                      {indicator}
                    </span>
                    <span className="text-ink">
                      {INDICATOR_META[indicator].label}
                    </span>
                  </td>
                  <td className="text-center tabular text-ink-muted">
                    {score ? score.peerScore.toFixed(1) : "—"}
                  </td>
                  <td className="text-center tabular text-ink-muted">
                    {score?.selfScore != null ? score.selfScore.toFixed(1) : "—"}
                  </td>
                  <td className="text-center tabular font-semibold text-ink">
                    {score?.finalScore ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-ink-muted">
        Digabung dari {evaluation.peerCount} penilai sejawat (80%) dan penilaian
        diri (20%). Pembulatan setengah ke atas.
      </p>
      <p className="mt-2 rounded-lg bg-cream/70 px-3 py-2 text-xs leading-5 text-ink-muted">
        <strong className="text-ink">Tindak lanjut:</strong>{" "}
        {ADVICE[evaluation.category]}
      </p>

      {evaluation.peerNotes.length > 0 ? (
        <div className="mt-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
            <MessageSquareQuote className="h-3.5 w-3.5 text-forest" aria-hidden />
            Catatan anonim sejawat
          </p>
          <ul className="mt-2 space-y-2">
            {evaluation.peerNotes.map((note) => (
              <li
                key={note.note}
                className="rounded-lg border border-cream-line bg-cream-card px-3 py-2 text-xs leading-5 text-ink-muted"
              >
                <span className="mb-1 block font-mono text-[10px] font-semibold text-forest">
                  {note.indicators.join(" · ")}
                </span>
                {note.note}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showSelfNote && evaluation.selfNote ? (
        <div className="mt-4 rounded-lg bg-sage/25 px-3 py-2 text-xs leading-5 text-ink-muted">
          <span className="font-semibold text-ink">Catatan diri:</span>{" "}
          {evaluation.selfNote}
        </div>
      ) : null}
    </section>
  );
}
