import type { Metadata } from "next";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Plus,
  Scale,
} from "lucide-react";

import { AlertBanner } from "~/components/ui/alert-banner";
import { EmptyState } from "~/components/ui/empty-state";
import { PageHeader } from "~/components/ui/page-header";
import { DecisionActions } from "~/components/decisions/decision-actions";
import { DecisionStepProgress } from "~/components/decisions/step-progress";
import { IdeaCard } from "~/components/decisions/idea-card";
import { StyleGuidePanel } from "~/components/decisions/style-guide-panel";
import { requireUser } from "~/server/auth";
import { getDecisionBoard } from "~/server/queries/decisions";
import {
  markRoundDeadlock,
  submitIdea,
} from "~/server/actions/decisions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Matriks keputusan",
};

interface PageProps {
  searchParams: { ok?: string; error?: string };
}

function Gate({
  ok,
  label,
}: {
  ok: boolean;
  label: string;
}) {
  return (
    <li className="flex items-start gap-2 text-xs">
      {ok ? (
        <CheckCircle2
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-status-done-text"
          aria-hidden
        />
      ) : (
        <Circle
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-muted/50"
          aria-hidden
        />
      )}
      <span className={ok ? "text-ink" : "text-ink-muted"}>{label}</span>
    </li>
  );
}

export default async function DecisionsPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const board = await getDecisionBoard(user.projectId);

  const isMember = user.accessLevel === "MEMBER";
  const isPm = user.role.code === "PM";
  const round = board.round;
  const project = board.project;

  const activeDecisions = board.decisions.filter(
    (decision) =>
      decision.status === "PROPOSED" || decision.status === "SHORTLISTED",
  );
  const allScored =
    activeDecisions.length > 0 &&
    activeDecisions.every((decision) => decision.allScored);
  const ideaGate =
    activeDecisions.length >= 2 &&
    activeDecisions.every(
      (decision) =>
        decision.proposedIdea.length >= 50 ||
        Boolean(decision.referenceUrl),
    );
  const totalWeight = board.criteria.reduce(
    (sum, criterion) => sum + criterion.weight,
    0,
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="M3 · Keputusan desain"
        title="Matriks keputusan"
        description="Ide dinilai dengan kriteria berbobot, ambang keterlaksanaan, dan aturan keputusan yang tercatat. Keputusan yang diterima dibekukan menjadi style guide."
        actions={
          <a href="#style-guide" className="btn-secondary">
            <Scale className="h-4 w-4" aria-hidden />
            Style guide
          </a>
        }
      />

      {searchParams.error ? (
        <AlertBanner tone="error">{searchParams.error}</AlertBanner>
      ) : null}
      {searchParams.ok ? (
        <AlertBanner tone="success">{searchParams.ok}</AlertBanner>
      ) : null}

      {round && round.deadlockCount >= 2 ? (
        <div className="flex items-start gap-2.5 rounded-card border border-status-blocked-solid/40 bg-status-blocked-soft/60 px-4 py-3">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-status-blocked-text"
            aria-hidden
          />
          <div className="text-xs text-status-blocked-text">
            <p className="font-semibold">
              Ronde ini sudah mengalami {round.deadlockCount} deadlock.
            </p>
            <p className="mt-0.5">
              Sistem menyarankan prototipe kecil dan eskalasi konflik Level 2.
              PM perlu memfasilitasi perbandingan terstruktur.
            </p>
          </div>
        </div>
      ) : null}

      {!round ? (
        <EmptyState
          title="Belum ada ronde desain"
          description="Ronde desain belum dibuat. Hubungi Project Manager untuk memulai ronde keputusan pertama."
        />
      ) : (
        <>
          <DecisionStepProgress currentStep={round.currentStep} />

          <div className="grid gap-4 lg:grid-cols-3">
            <section className="card-surface p-5 lg:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                    Ronde aktif
                  </p>
                  <h2 className="mt-0.5 font-heading text-lg font-bold text-ink">
                    {round.topic}
                  </h2>
                </div>
                <span className="rounded-full bg-forest-50 px-2.5 py-1 text-[11px] font-semibold text-forest">
                  Langkah {round.currentStep} dari 6
                </span>
              </div>

              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Gerbang sebelum keputusan
              </p>
              <ul className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                <Gate
                  ok={Boolean(project?.productGoal && project.goalConfirmed)}
                  label="Tujuan produk sudah disepakati"
                />
                <Gate
                  ok={Boolean(project?.audienceProfile && project.audienceConfirmed)}
                  label="Profil audiens sudah disepakati"
                />
                <Gate
                  ok={ideaGate}
                  label="Minimal 2 ide dengan referensi atau deskripsi ≥50 karakter"
                />
                <Gate
                  ok={allScored}
                  label="Seluruh anggota menilai semua ide"
                />
              </ul>

              {project?.productGoal ? (
                <div className="mt-3 grid gap-2 rounded-lg bg-cream/60 px-3 py-2.5 text-xs sm:grid-cols-2">
                  <p>
                    <span className="font-semibold text-ink">Tujuan produk:</span>{" "}
                    <span className="text-ink-muted">{project.productGoal}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-ink">Audiens:</span>{" "}
                    <span className="text-ink-muted">{project.audienceProfile}</span>
                  </p>
                </div>
              ) : null}

              {isPm && round.currentStep <= 3 ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-status-doing-solid/30 bg-status-doing-soft/40 px-3 py-2.5">
                  <div className="text-xs text-status-doing-text">
                    <p className="font-semibold">
                      Deadlock tercatat: {round.deadlockCount} putaran
                    </p>
                    <p className="mt-0.5">
                      Deadlock kedua otomatis membuka konflik Level 2 dan
                      menandai PM. Catat hanya bila penilaian benar-benar
                      berjalan dua putaran tanpa keputusan.
                    </p>
                  </div>
                  <form action={markRoundDeadlock}>
                    <input type="hidden" name="roundId" value={round.id} />
                    <button type="submit" className="btn-secondary py-1.5 text-xs">
                      Catat deadlock +1
                    </button>
                  </form>
                </div>
              ) : null}

              {isMember && round.currentStep <= 3 ? (
                <details className="mt-4 rounded-lg border border-forest/25 bg-forest-50/50">
                  <summary className="flex cursor-pointer select-none items-center gap-1.5 px-3 py-2 text-xs font-semibold text-forest">
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Usulkan ide baru
                  </summary>
                  <form
                    action={submitIdea}
                    className="space-y-3 border-t border-forest/15 p-3"
                  >
                    <input type="hidden" name="roundId" value={round.id} />
                    <div>
                      <label htmlFor="title" className="label-base">
                        Judul ide
                      </label>
                      <input
                        id="title"
                        name="title"
                        required
                        maxLength={120}
                        className="input-base"
                        placeholder="Contoh: Hangat & manusiawi"
                      />
                    </div>
                    <div>
                      <label htmlFor="proposedIdea" className="label-base">
                        Deskripsi ide (minimal 50 karakter)
                      </label>
                      <textarea
                        id="proposedIdea"
                        name="proposedIdea"
                        rows={3}
                        required
                        minLength={50}
                        className="input-base"
                        placeholder="Jelaskan arah visual, alasan, dan cara mewujudkannya."
                      />
                    </div>
                    <div>
                      <label htmlFor="referenceUrl" className="label-base">
                        Tautan referensi{" "}
                        <span className="font-normal text-ink-muted">(opsional)</span>
                      </label>
                      <input
                        id="referenceUrl"
                        name="referenceUrl"
                        type="url"
                        className="input-base"
                        placeholder="https://..."
                      />
                    </div>
                    <button type="submit" className="btn-primary">
                      Kirim ide
                    </button>
                  </form>
                </details>
              ) : null}
            </section>

            <section className="card-surface p-5">
              <h2 className="font-heading text-base font-bold text-ink">
                Kriteria penilaian
              </h2>
              <p className="mt-1 text-xs text-ink-muted">
                Total bobot {totalWeight}. Skor ide = rata-rata berbobot, skala
                0–100.
              </p>
              <table className="table-base mt-3">
                <thead>
                  <tr>
                    <th>Kriteria</th>
                    <th className="text-right">Bobot</th>
                    <th className="text-right">Ambang</th>
                  </tr>
                </thead>
                <tbody>
                  {board.criteria.map((criterion) => (
                    <tr key={criterion.id}>
                      <td className="text-xs font-medium">{criterion.name}</td>
                      <td className="text-right text-xs tabular">
                        {criterion.weight}
                      </td>
                      <td className="text-right text-xs tabular text-ink-muted">
                        {criterion.minThreshold ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-[11px] leading-5 text-ink-muted">
                FEASIBILITY di bawah ambang mengeliminasi ide walau skor
                totalnya tinggi. PM tidak dapat menyelamatkan ide yang gagal
                ambang.
              </p>
            </section>
          </div>

          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="font-heading text-lg font-bold text-ink">
                  Ide yang dinilai
                </h2>
                <p className="text-xs text-ink-muted">
                  Diurutkan dari skor berbobot tertinggi. Penulis ide
                  ditampilkan setelah semua anggota menilai.
                </p>
              </div>
              <span className="text-xs text-ink-muted">
                {board.decisions.length} ide · {board.criteria.length} kriteria
              </span>
            </div>

            {board.decisions.length > 0 ? (
              <div className="grid gap-3 xl:grid-cols-2">
                {board.decisions.map((decision) => (
                  <IdeaCard
                    key={decision.id}
                    decision={decision}
                    criteria={board.criteria}
                    currentUserId={user.id}
                    currentStep={round.currentStep}
                    isMember={isMember}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="Belum ada ide"
                description="Usulkan ide pertama dengan referensi atau deskripsi yang jelas."
              />
            )}
          </section>

          <DecisionActions
            board={board}
            isPM={isPm}
            pmApprovedByAll={user.pmApprovedByAll}
          />

          <StyleGuidePanel
            board={board}
            styleGuide={board.styleGuide}
            isMember={isMember}
            isPM={isPm}
          />
        </>
      )}
    </div>
  );
}
