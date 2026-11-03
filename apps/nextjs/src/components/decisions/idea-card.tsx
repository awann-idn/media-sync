import Link from "next/link";
import { AlertTriangle, ExternalLink, Lock, Star } from "lucide-react";

import { DECISION_STATUS_META } from "@mediasync/shared";

import { StatusBadge, type BadgeTone } from "~/components/ui/status-badge";
import { cn, initials } from "~/lib/utils";
import { submitDecisionScores } from "~/server/actions/decisions";
import type { DecisionBoard } from "~/server/queries/decisions";

type DecisionItem = DecisionBoard["decisions"][number];
type DecisionStatus = keyof typeof DECISION_STATUS_META;

const statusTone: Record<DecisionStatus, BadgeTone> = {
  PROPOSED: "idle",
  SHORTLISTED: "review",
  ACCEPTED: "done",
  REJECTED: "idle",
  FROZEN: "done",
};

const scoreChoices = [1, 2, 3, 4, 5];

export function IdeaCard({
  decision,
  criteria,
  currentUserId,
  currentStep,
  isMember,
}: {
  decision: DecisionItem;
  criteria: DecisionBoard["criteria"];
  currentUserId: string;
  currentStep: number;
  isMember: boolean;
}) {
  const submittedCount = decision.scores.filter(
    (score) => score.scorerId === currentUserId,
  ).length;
  const alreadyScored = submittedCount === criteria.length;
  const canScore =
    isMember &&
    currentStep <= 3 &&
    (decision.status === "PROPOSED" || decision.status === "SHORTLISTED") &&
    !alreadyScored;

  return (
    <article
      className={cn(
        "card-surface p-4",
        decision.eliminated && "border-status-blocked-solid/40",
        decision.status === "ACCEPTED" && "border-status-done-solid/60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-heading text-sm font-bold",
              decision.status === "ACCEPTED"
                ? "bg-status-done-solid text-white"
                : "bg-forest-50 text-forest",
            )}
          >
            #{decision.rank}
          </span>
          <div className="min-w-0">
            <h3 className="font-heading text-base font-bold leading-6 text-ink">
              {decision.title}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <StatusBadge
                tone={statusTone[decision.status]}
                withDot={false}
                className="px-2 py-0.5 text-[10px]"
              >
                {DECISION_STATUS_META[decision.status]}
              </StatusBadge>
              {decision.eliminated ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-status-blocked-soft px-2 py-0.5 text-[10px] font-semibold text-status-blocked-text">
                  <AlertTriangle className="h-3 w-3" aria-hidden />
                  Gagal ambang FEASIBILITY
                </span>
              ) : null}
              {decision.status === "ACCEPTED" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-status-done-soft px-2 py-0.5 text-[10px] font-semibold text-status-done-text">
                  <Star className="h-3 w-3" aria-hidden />
                  Ide terpilih
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-bold tabular text-forest">
            {decision.computedScore.toFixed(1)}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-ink-muted">
            skor berbobot
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-ink-muted">
        {decision.proposedIdea}
      </p>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-ink-muted">
        {decision.allScored ? (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white"
              style={{ backgroundColor: decision.proposer.avatarColor }}
            >
              {initials(decision.proposer.name)}
            </span>
            Diusulkan {decision.proposer.name}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3 w-3" aria-hidden />
            Penulis anonim selama penilaian
          </span>
        )}
        <span className="tabular">
          {decision.scoredMembers} anggota menilai
        </span>
        {decision.referenceUrl ? (
          <a
            href={decision.referenceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-forest hover:text-forest-700"
          >
            <ExternalLink className="h-3 w-3" aria-hidden />
            Referensi
          </a>
        ) : null}
      </div>

      {decision.failed.length > 0 ? (
        <p className="mt-2 rounded-lg bg-status-blocked-soft/60 px-2.5 py-1.5 text-[11px] font-medium text-status-blocked-text">
          Tidak memenuhi ambang:{" "}
          {decision.perCriterion
            .filter((row) => row.failed)
            .map(
              (row) =>
                `${row.criterion.name} (${row.mean.toFixed(1)} < ${row.criterion.minThreshold})`,
            )
            .join(", ")}
          . Ide ini tidak dapat dipilih atau di-tie-break.
        </p>
      ) : null}

      <details className="mt-3 rounded-lg border border-cream-line bg-cream/40">
        <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-ink">
          Rincian skor per kriteria
        </summary>
        <div className="overflow-x-auto border-t border-cream-line/70">
          <table className="table-base min-w-[420px]">
            <thead>
              <tr>
                <th>Kriteria</th>
                <th>Bobot</th>
                <th>Rata-rata</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {decision.perCriterion.map((row) => (
                <tr key={row.criterion.id}>
                  <td className="text-xs font-medium">{row.criterion.name}</td>
                  <td className="text-xs tabular text-ink-muted">
                    {row.criterion.weight}
                  </td>
                  <td className="text-xs font-semibold tabular">
                    {row.mean > 0 ? row.mean.toFixed(1) : "—"}
                  </td>
                  <td className="text-xs">
                    {row.failed ? (
                      <span className="font-semibold text-status-blocked-text">
                        &lt; {row.criterion.minThreshold}
                      </span>
                    ) : (
                      <span className="text-status-done-text">Lolos</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {alreadyScored ? (
        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-sage/30 px-2.5 py-2 text-[11px] font-medium text-ink-muted">
          <Lock className="h-3 w-3" aria-hidden />
          Penilaian Anda sudah terkunci.
        </p>
      ) : null}

      {canScore ? (
        <details className="mt-3 rounded-lg border border-forest/30 bg-forest-50/60">
          <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-forest">
            Nilai ide ini (1 = sangat buruk, 5 = sangat baik)
          </summary>
          <form action={submitDecisionScores} className="space-y-3 border-t border-forest/15 p-3">
            <input type="hidden" name="decisionId" value={decision.id} />
            {criteria.map((criterion) => (
              <fieldset key={criterion.id}>
                <legend className="mb-1 text-[11px] font-semibold text-ink">
                  {criterion.name}
                  <span className="ml-1 font-normal text-ink-muted">
                    · bobot {criterion.weight}
                    {criterion.minThreshold
                      ? ` · min ${criterion.minThreshold}`
                      : ""}
                  </span>
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  {scoreChoices.map((value) => (
                    <label
                      key={value}
                      className="flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg border border-cream-line bg-paper text-xs font-semibold text-ink has-[:checked]:border-forest has-[:checked]:bg-forest has-[:checked]:text-cream-card"
                    >
                      <input
                        type="radio"
                        name={`score-${criterion.id}`}
                        value={value}
                        required
                        className="sr-only"
                      />
                      {value}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <button type="submit" className="btn-primary w-full">
              Kirim & kunci penilaian
            </button>
            <p className="text-[10px] leading-4 text-ink-muted">
              Skor tidak dapat diubah setelah dikirim. Nilai anggota lain baru
              ditampilkan setelah semua menilai.
            </p>
          </form>
        </details>
      ) : null}

      {!isMember ? null : canScore === false &&
        currentStep <= 3 &&
        !alreadyScored &&
        decision.status !== "REJECTED" ? (
        <p className="mt-3 text-[11px] text-ink-muted">
          Anda belum menilai ide ini.
        </p>
      ) : null}

      {decision.status === "ACCEPTED" || decision.status === "FROZEN" ? (
        <div className="mt-3 rounded-lg bg-status-done-soft/60 px-3 py-2 text-[11px] text-status-done-text">
          <p className="font-semibold">
            Diputuskan melalui{" "}
            {decision.decidedBy === "CONSENSUS"
              ? "konsensus"
              : decision.decidedBy === "MAJORITY"
                ? "mayoritas"
                : "tie-break PM"}
            .
          </p>
          {decision.rationale ? <p className="mt-0.5">{decision.rationale}</p> : null}
        </div>
      ) : null}

      {decision.status === "ACCEPTED" && decision.roundId ? (
        <Link
          href="#style-guide"
          className="mt-2 inline-block text-[11px] font-semibold text-forest underline underline-offset-2"
        >
          Lanjut bekukan style guide →
        </Link>
      ) : null}
    </article>
  );
}
