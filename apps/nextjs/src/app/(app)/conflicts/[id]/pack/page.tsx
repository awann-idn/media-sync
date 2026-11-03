import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import {
  CONFLICT_LEVEL_META,
  CONFLICT_TYPE_META,
  EVALUATION_CATEGORY_META,
  INTERVENTION_CAUSE_META,
  INTERVENTION_STEP_META,
  PHASE_META,
  TASK_STATUS_META,
} from "@mediasync/shared";

import { PrintButton } from "~/components/print-button";
import { StatusBadge } from "~/components/ui/status-badge";
import { formatDate, formatDateTime } from "~/lib/format";
import { requireUser } from "~/server/auth";
import { getEscalationPack } from "~/server/queries/conflicts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Escalation Pack",
};

interface PageProps {
  params: { id: string };
}

const DECISION_METHOD_LABEL: Record<string, string> = {
  CONSENSUS: "Konsensus",
  MAJORITY: "Suara mayoritas",
  PM_TIEBREAK: "Tie-break PM",
};

export default async function EscalationPackPage({ params }: PageProps) {
  const user = await requireUser();
  const {
    conflict,
    project,
    meetings,
    decisions,
    evaluations,
    interventions,
    tasks,
    generatedAt,
  } = await getEscalationPack(params.id, user.projectId);

  if (!conflict || !project) notFound();

  const taskStats = new Map<
    string,
    { total: number; done: number; active: number; blocked: number }
  >();
  for (const task of tasks) {
    if (!task.assignedUserId) continue;
    const stats = taskStats.get(task.assignedUserId) ?? {
      total: 0,
      done: 0,
      active: 0,
      blocked: 0,
    };
    stats.total += 1;
    if (task.status === "COMPLETED") stats.done += 1;
    else if (task.status === "BLOCKED") stats.blocked += 1;
    else if (task.status !== "NOT_STARTED") stats.active += 1;
    taskStats.set(task.assignedUserId, stats);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 rounded-xl bg-paper p-6 print:max-w-none print:rounded-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          href={`/conflicts/${conflict.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-forest hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Kembali ke detail konflik
        </Link>
        <PrintButton />
      </div>

      <header className="border-b-2 border-forest pb-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-forest">
          MediaSync · Escalation Pack
        </p>
        <h1 className="mt-1 font-heading text-2xl font-bold text-ink">
          {conflict.title}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {project.name} · dibuat {formatDateTime(generatedAt)} ·{" "}
          {CONFLICT_TYPE_META[conflict.type]} ·{" "}
          {CONFLICT_LEVEL_META[
            conflict.level as keyof typeof CONFLICT_LEVEL_META
          ]}
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          Dibuka oleh {conflict.openedBy.name} pada{" "}
          {formatDateTime(conflict.createdAt)} · status {conflict.status}
          {conflict.escalatedAt
            ? ` · dieskalasi ${formatDateTime(conflict.escalatedAt)}`
            : ""}
        </p>
      </header>

      <section>
        <h2 className="font-heading text-base font-bold text-ink">
          1. Ringkasan konflik
        </h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">
          {conflict.description}
        </p>
      </section>

      <section>
        <h2 className="font-heading text-base font-bold text-ink">
          2. Permintaan spesifik ke dosen
        </h2>
        <p className="mt-2 whitespace-pre-wrap rounded-lg border border-cream-line bg-cream/40 p-3 text-sm leading-6 text-ink">
          {conflict.summary ??
            "Belum ada permintaan spesifik. PM perlu melengkapi bagian ini sebelum eskalasi."}
        </p>
      </section>

      <section>
        <h2 className="font-heading text-base font-bold text-ink">
          3. Kronologi penyelesaian
        </h2>
        <ol className="mt-2 space-y-3">
          {conflict.steps.map((step) => (
            <li
              key={step.id}
              className="rounded-lg border border-cream-line p-3 text-sm"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-forest">
                {CONFLICT_LEVEL_META[
                  step.level as keyof typeof CONFLICT_LEVEL_META
                ]}{" "}
                · {formatDateTime(step.createdAt)}
              </p>
              <p className="mt-1 whitespace-pre-wrap leading-6 text-ink">
                {step.summary}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                Dicatat oleh {step.decidedBy?.name ?? "sistem"}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="font-heading text-base font-bold text-ink">
          4. Riwayat keputusan desain
        </h2>
        {decisions.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">Belum ada keputusan desain.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Topik</th>
                  <th>Ide</th>
                  <th>Pengusul</th>
                  <th>Status</th>
                  <th className="text-right">Skor</th>
                  <th>Metode</th>
                </tr>
              </thead>
              <tbody>
                {decisions.map((decision) => (
                  <tr key={decision.id}>
                    <td>{decision.round.topic}</td>
                    <td>
                      <p className="font-medium text-ink">{decision.title}</p>
                      {decision.rationale ? (
                        <p className="mt-1 text-xs text-ink-muted">
                          Alasan: {decision.rationale}
                        </p>
                      ) : null}
                    </td>
                    <td>{decision.proposer.name}</td>
                    <td>{decision.status}</td>
                    <td className="text-right tabular">
                      {decision.score > 0 ? decision.score.toFixed(1) : "-"}
                    </td>
                    <td>
                      {decision.decidedBy
                        ? DECISION_METHOD_LABEL[decision.decidedBy] ??
                          decision.decidedBy
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-heading text-base font-bold text-ink">
          5. Notulen rapat terkait
        </h2>
        {meetings.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">Belum ada rapat selesai.</p>
        ) : (
          <div className="mt-2 space-y-3">
            {meetings.map((meeting) => {
              const counts = meeting.attendance.reduce(
                (acc, entry) => {
                  acc[entry.status] = (acc[entry.status] ?? 0) + 1;
                  return acc;
                },
                {} as Record<string, number>,
              );
              return (
                <article
                  key={meeting.id}
                  className="rounded-lg border border-cream-line p-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-sm font-bold text-ink">
                      {meeting.title}
                    </h3>
                    <p className="text-xs text-ink-muted">
                      {formatDateTime(meeting.scheduledAt)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    Hadir {counts.PRESENT ?? 0} · Izin {counts.EXCUSED ?? 0} ·
                    Tidak hadir {counts.ABSENT ?? 0}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink">
                    {meeting.minutes ?? "-"}
                  </p>
                  {meeting.decisions.length > 0 ? (
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink">
                      {meeting.decisions.map((decision) => (
                        <li key={decision.id}>{decision.text}</li>
                      ))}
                    </ol>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-heading text-base font-bold text-ink">
          6. Metrik kontribusi
        </h2>
        <div className="mt-2 overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Anggota</th>
                <th>Peran</th>
                <th className="text-right">Aktif</th>
                <th className="text-right">Disiplin</th>
                <th className="text-right">Total</th>
                <th>Kategori</th>
                <th className="text-right">Tugas selesai</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map((evaluation) => {
                const category = EVALUATION_CATEGORY_META[evaluation.category];
                const stats = taskStats.get(evaluation.userId) ?? {
                  total: 0,
                  done: 0,
                  active: 0,
                  blocked: 0,
                };
                return (
                  <tr key={evaluation.id}>
                    <td className="font-medium text-ink">
                      {evaluation.user.name}
                    </td>
                    <td>{evaluation.user.role.name}</td>
                    <td className="text-right tabular">{evaluation.activeScore}</td>
                    <td className="text-right tabular">
                      {evaluation.disciplineScore}
                    </td>
                    <td className="text-right font-semibold tabular">
                      {evaluation.totalScore}
                    </td>
                    <td>{category.label}</td>
                    <td className="text-right tabular">
                      {stats.done}/{stats.total}
                      {stats.blocked > 0 ? ` · ${stats.blocked} terhambat` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          Skor evaluasi periode pra-produksi (80% sejawat + 20% penilaian
          diri). Metrik tugas dihitung dari seluruh tugas proyek.
        </p>
      </section>

      <section>
        <h2 className="font-heading text-base font-bold text-ink">
          7. Status pekerjaan
        </h2>
        <div className="mt-2 overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>#</th>
                <th>Tugas</th>
                <th>Fase</th>
                <th>PIC</th>
                <th>Status</th>
                <th>Tenggat internal</th>
                <th>Tenggat resmi</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const status = TASK_STATUS_META[task.status];
                return (
                  <tr key={task.id}>
                    <td className="tabular">{task.stepNo}</td>
                    <td>{task.title}</td>
                    <td>{PHASE_META[task.phase]}</td>
                    <td>{task.assignedUser?.name ?? "-"}</td>
                    <td>
                      <StatusBadge tone={status.tone} withDot={false}>
                        {status.label}
                      </StatusBadge>
                    </td>
                    <td>{formatDate(task.internalDeadline)}</td>
                    <td>{formatDate(task.officialDeadline)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-heading text-base font-bold text-ink">
          8. Intervensi yang sudah dilakukan
        </h2>
        {interventions.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            Belum ada intervensi yang tercatat.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {interventions.map((intervention) => (
              <li
                key={intervention.id}
                className="rounded-lg border border-cream-line p-3 text-sm"
              >
                <p className="font-medium text-ink">
                  {intervention.user.name} ·{" "}
                  {INTERVENTION_STEP_META[intervention.step]}
                  {intervention.causeCode
                    ? ` · ${INTERVENTION_CAUSE_META[intervention.causeCode]}`
                    : ""}
                </p>
                {intervention.notes ? (
                  <p className="mt-1 text-ink-muted">{intervention.notes}</p>
                ) : null}
                <p className="mt-1 text-xs text-ink-muted">
                  Dicatat {intervention.recordedBy.name} ·{" "}
                  {formatDateTime(intervention.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="border-t border-cream-line pt-3 text-xs text-ink-muted">
        <p className="inline-flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" aria-hidden />
          Dokumen dibuat otomatis oleh MediaSync. Escalation Pack memuat konteks
          yang sama untuk semua pihak agar keputusan dosen berbasis fakta.
        </p>
      </footer>
    </div>
  );
}
