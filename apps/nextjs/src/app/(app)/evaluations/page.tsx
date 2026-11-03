import type { Metadata } from "next";
import { ClipboardCheck, Eye, Info, Users } from "lucide-react";

import {
  EVALUATION_CATEGORY_META,
  EVALUATION_PERIOD_META,
} from "@mediasync/shared";

import { AlertBanner } from "~/components/ui/alert-banner";
import { EmptyState } from "~/components/ui/empty-state";
import { PageHeader } from "~/components/ui/page-header";
import { StatusBadge } from "~/components/ui/status-badge";
import { EvaluationForm } from "~/components/evaluations/evaluation-form";
import { EvaluationPeriodTabs } from "~/components/evaluations/period-tabs";
import { EvaluationSummaryCard } from "~/components/evaluations/evaluation-summary";
import { EvaluationTeamOverview } from "~/components/evaluations/team-overview";
import { InterventionPanel } from "~/components/evaluations/intervention-panel";
import { requireUser } from "~/server/auth";
import {
  getEvaluationsPage,
  isEvaluationPeriod,
  type EvaluationPeriodKey,
} from "~/server/queries/evaluations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Evaluasi sejawat",
};

interface PageProps {
  searchParams: { period?: string; ok?: string; error?: string };
}

export default async function EvaluationsPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const period: EvaluationPeriodKey =
    searchParams.period && isEvaluationPeriod(searchParams.period)
      ? searchParams.period
      : "PRE";

  const canSeeAll =
    user.accessLevel === "OBSERVER" ||
    (user.accessLevel === "MEMBER" && user.role.code === "PM");
  const isPM = user.accessLevel === "MEMBER" && user.role.code === "PM";
  const isMember = user.accessLevel === "MEMBER";

  const data = await getEvaluationsPage({
    projectId: user.projectId,
    viewerId: user.id,
    period,
    canSeeAll,
  });

  const own = data.own;
  const peers = data.members.filter((row) => row.member.id !== user.id);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="M4 · Evaluasi sejawat"
        title="Evaluasi kontribusi"
        description="Nilai kontribusi dengan indikator aktivitas dan disiplin. Skor sejawat anonim, digabung 80% sejawat dan 20% penilaian diri. Kategori menentukan tindak lanjut, bukan sanksi otomatis."
        actions={
          <EvaluationPeriodTabs active={period} />
        }
      />

      {searchParams.error ? (
        <AlertBanner tone="error">{searchParams.error}</AlertBanner>
      ) : null}
      {searchParams.ok ? (
        <AlertBanner tone="success">{searchParams.ok}</AlertBanner>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="card-surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            Aktivitas · A1–A3
          </p>
          <p className="mt-1 text-sm text-ink">
            Kehadiran, inisiatif, dan kesiapan membantu. Maksimal 15 poin.
          </p>
        </div>
        <div className="card-surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            Disiplin · D1–D3
          </p>
          <p className="mt-1 text-sm text-ink">
            Ketepatan waktu internal, kualitas, dan komunikasi hambatan.
            Maksimal 15 poin.
          </p>
        </div>
        <div className="card-surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            Rentang kategori
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {Object.entries(EVALUATION_CATEGORY_META).map(([key, meta]) => (
              <StatusBadge key={key} tone={meta.tone} withDot={false}>
                {meta.label}
              </StatusBadge>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-ink-muted">
            25–30 · 18–24 · di bawah 18
          </p>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
        <Info className="h-3.5 w-3.5 text-forest" aria-hidden />
        Periode aktif:{" "}
        <strong className="text-ink">{EVALUATION_PERIOD_META[period]}</strong> ·{" "}
        {data.evaluationCount} dari {data.memberCount} anggota memiliki agregat.
      </div>

      {canSeeAll ? <EvaluationTeamOverview rows={data.members} /> : null}

      {isMember ? (
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-forest" aria-hidden />
              <h2 className="font-heading text-base font-bold text-ink">
                Evaluasi saya
              </h2>
            </div>

            {own?.evaluation ? (
              <EvaluationSummaryCard row={own} showSelfNote />
            ) : (
              <EmptyState
                title="Belum ada agregat penilaian"
                description="Anda belum menerima penilaian sejawat pada periode ini. Penilaian diri tetap dapat diisi."
              />
            )}

            <section className="card-surface p-5">
              <h3 className="text-sm font-semibold text-ink">Penilaian diri</h3>
              <p className="mt-1 text-xs leading-5 text-ink-muted">
                Penilaian diri menyumbang 20% dari skor akhir. Jujur menilai
                hambatan membantu tim memberi dukungan yang tepat.
              </p>
              <div className="mt-3">
                <EvaluationForm
                  period={period}
                  subjectName={user.name}
                  isSelf
                  submitted={own?.selfSubmitted ?? false}
                />
              </div>
            </section>
          </div>

          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-forest" aria-hidden />
              <h2 className="font-heading text-base font-bold text-ink">
                Nilai rekan tim
              </h2>
            </div>
            <p className="-mt-2 text-xs text-ink-muted">
              Setiap anggota menilai rekan lain. Nama penilai tidak ditampilkan
              kepada anggota yang dinilai.
            </p>

            {peers.length === 0 ? (
              <EmptyState
                title="Belum ada rekan untuk dinilai"
                description="Anggota tim belum tersedia pada periode ini."
              />
            ) : (
              peers.map((row) => (
                <details
                  key={row.member.id}
                  className="card-surface overflow-hidden"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                        style={{ backgroundColor: row.member.avatarColor }}
                      >
                        {row.member.name
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part[0]?.toUpperCase() ?? "")
                          .join("")}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {row.member.name}
                        </span>
                        <span className="block text-xs text-ink-muted">
                          {row.member.roleName}
                        </span>
                      </span>
                    </span>
                    {row.submittedByMe ? (
                      <StatusBadge tone="done">Sudah dinilai</StatusBadge>
                    ) : (
                      <span className="text-xs font-medium text-forest">
                        Nilai sekarang
                      </span>
                    )}
                  </summary>
                  <div className="border-t border-cream-line px-5 py-4">
                    <EvaluationForm
                      period={period}
                      subjectId={row.member.id}
                      subjectName={row.member.name}
                      submitted={row.submittedByMe}
                    />
                  </div>
                </details>
              ))
            )}
          </section>
        </div>
      ) : null}

      {user.accessLevel === "OBSERVER" ? (
        <section className="flex items-start gap-2.5 rounded-card border border-cream-line bg-cream-card px-4 py-3">
          <Eye className="mt-0.5 h-4 w-4 shrink-0 text-forest" aria-hidden />
          <div>
            <h2 className="font-heading text-base font-bold text-ink">
              Mode observer
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Anda dapat melihat agregat seluruh anggota dan riwayat intervensi,
              tetapi tidak dapat mengisi penilaian atau mencatat tindakan.
            </p>
          </div>
        </section>
      ) : null}

      {canSeeAll ? (
        <InterventionPanel rows={data.members} isPM={isPM} period={period} />
      ) : null}
    </div>
  );
}
