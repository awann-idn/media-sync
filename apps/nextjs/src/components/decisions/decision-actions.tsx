import {
  AlertTriangle,
  CheckCircle2,
  Gavel,
  Info,
  Lock,
} from "lucide-react";

import { decideRound } from "~/server/actions/decisions";
import type { DecisionBoard } from "~/server/queries/decisions";

export function DecisionActions({
  board,
  isPM,
  pmApprovedByAll,
}: {
  board: DecisionBoard;
  isPM: boolean;
  pmApprovedByAll: boolean;
}) {
  const { decisions, recommendation, round } = board;
  if (!round) return null;

  const accepted = decisions.find(
    (decision) =>
      decision.status === "ACCEPTED" || decision.status === "FROZEN",
  );
  const eligible = decisions.filter((decision) => !decision.eliminated);
  const allScored = decisions
    .filter(
      (decision) =>
        decision.status === "PROPOSED" || decision.status === "SHORTLISTED",
    )
    .every((decision) => decision.allScored);

  if (accepted) {
    return (
      <section className="card-surface border-status-done-solid/40 p-5">
        <div className="flex items-start gap-2.5">
          <CheckCircle2
            className="mt-0.5 h-5 w-5 shrink-0 text-status-done-text"
            aria-hidden
          />
          <div>
            <h2 className="font-heading text-base font-bold text-ink">
              Keputusan sudah tercatat
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Ide <strong className="text-ink">{accepted.title}</strong>{" "}
              diterima melalui{" "}
              {accepted.decidedBy === "CONSENSUS"
                ? "konsensus"
                : accepted.decidedBy === "MAJORITY"
                  ? "mayoritas"
                  : "tie-break PM"}
              .
            </p>
            {accepted.rationale ? (
              <p className="mt-1 text-xs text-ink-muted">
                Alasan: {accepted.rationale}
              </p>
            ) : null}
            {accepted.status === "ACCEPTED" ? (
              <p className="mt-2 rounded-lg bg-cream/70 px-3 py-2 text-xs text-ink-muted">
                Langkah berikutnya: bekukan style guide pada bagian bawah
                halaman agar menjadi acuan produksi dan QC.
              </p>
            ) : (
              <p className="mt-2 inline-flex items-center gap-1 rounded-lg bg-sage/40 px-3 py-2 text-xs font-medium text-forest">
                <Lock className="h-3 w-3" aria-hidden />
                Style guide sudah dibekukan. Perubahan hanya lewat change
                request berbasis rapat.
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  if (!isPM) {
    return (
      <section className="card-surface p-5">
        <div className="flex items-start gap-2.5">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-status-review-text" aria-hidden />
          <div>
            <h2 className="font-heading text-base font-bold text-ink">
              Menunggu keputusan PM
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Rekomendasi sistem:{" "}
              <strong className="text-ink">
                {recommendation?.method === "PM_TIEBREAK"
                  ? "tie-break PM dengan alasan tertulis"
                  : "mayoritas"}
              </strong>
              {recommendation?.gap !== null &&
              recommendation?.gap !== undefined
                ? ` · selisih skor teratas ${recommendation.gap.toFixed(1)} poin`
                : ""}
              . Skor terbuka setelah semua anggota menilai.
            </p>
            {!allScored ? (
              <p className="mt-2 text-xs font-medium text-status-blocked-text">
                Masih ada ide yang belum dinilai seluruh anggota.
              </p>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  const needsTiebreak = recommendation?.method === "PM_TIEBREAK";

  return (
    <section className="card-surface p-5">
      <div className="flex items-start gap-2.5">
        <Gavel className="mt-0.5 h-5 w-5 shrink-0 text-forest" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-base font-bold text-ink">
            Tetapkan keputusan
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Sistem menghitung skor berbobot dari penilaian anggota. Ide yang
            gagal ambang FEASIBILITY otomatis dikeluarkan dan tidak dapat
            dipilih.
          </p>

          {needsTiebreak ? (
            <div className="mt-3 rounded-lg border border-status-doing-solid/40 bg-status-doing-soft/50 px-3 py-2.5 text-xs text-status-doing-text">
              <p className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                Tie-break diperlukan
              </p>
              <p className="mt-0.5">
                Selisih skor teratas di bawah 5 poin. PM wajib menulis alasan.
                Status persetujuan seluruh anggota:{" "}
                <strong>{pmApprovedByAll ? "sudah disetujui" : "belum"}</strong>.
              </p>
            </div>
          ) : (
            <p className="mt-3 rounded-lg bg-cream/70 px-3 py-2 text-xs text-ink-muted">
              {recommendation?.winnerId
                ? "Satu ide unggul dengan selisih minimal 5 poin (mayoritas)."
                : "Pilih satu ide layak untuk ditetapkan."}
            </p>
          )}

          <form action={decideRound} className="mt-4 space-y-3">
            <div>
              <label htmlFor="decisionId" className="label-base">
                Ide terpilih
              </label>
              <select
                id="decisionId"
                name="decisionId"
                className="input-base"
                defaultValue={
                  recommendation?.winnerId ?? eligible[0]?.id ?? ""
                }
                required
              >
                {eligible.map((decision) => (
                  <option key={decision.id} value={decision.id}>
                    #{decision.rank} {decision.title} — {decision.computedScore.toFixed(1)}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-start gap-2 text-xs text-ink">
              <input
                type="checkbox"
                name="allAgree"
                className="mt-0.5 h-4 w-4 rounded border-cream-line text-forest focus:ring-forest"
              />
              <span>
                Semua anggota menyetujui ide teratas (keputusan konsensus).
              </span>
            </label>

            <div>
              <label htmlFor="rationale" className="label-base">
                Alasan keputusan{" "}
                {needsTiebreak ? (
                  <span className="text-status-blocked-text">*wajib</span>
                ) : (
                  <span className="font-normal text-ink-muted">(opsional)</span>
                )}
              </label>
              <textarea
                id="rationale"
                name="rationale"
                rows={3}
                required={needsTiebreak}
                className="input-base"
                placeholder="Contoh: ide hangat paling sesuai tujuan produk dan tetap lolos ambang keterlaksanaan."
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={!allScored || eligible.length === 0}
            >
              Tetapkan & catat keputusan
            </button>
            {!allScored ? (
              <p className="text-[11px] font-medium text-status-blocked-text">
                Tombol aktif setelah semua anggota menilai semua ide.
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </section>
  );
}
