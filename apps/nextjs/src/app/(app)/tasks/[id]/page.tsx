import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Calendar,
  CheckCircle2,
  FileText,
  Link2,
  Play,
  RotateCcw,
  Send,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";

import { PHASE_META } from "@mediasync/shared";

import { AlertBanner } from "~/components/ui/alert-banner";
import { TaskStatusBadge } from "~/components/ui/task-status-badge";
import { formatDate, formatDateTime, relativeDeadline } from "~/lib/format";
import { cn, initials } from "~/lib/utils";
import { changeTaskStatus, uploadDeliverable } from "~/server/actions/tasks";
import { canApproveTask, requireUser } from "~/server/auth";
import {
  computeTaskFlags,
  getTaskDetail,
  listTasks,
} from "~/server/queries/tasks";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function HiddenTask({ taskId, intent }: { taskId: string; intent: string }) {
  return (
    <>
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="intent" value={intent} />
    </>
  );
}

export default async function TaskDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const task = await getTaskDetail(params.id);
  if (!task || task.projectId !== user.projectId) notFound();

  const allTasks = await listTasks(user.projectId);
  const flags = computeTaskFlags(allTasks);
  const flag = flags.get(task.id);
  const isMember = user.accessLevel === "MEMBER";
  const isAssignee = user.id === task.assignedUserId;
  const canApprove = canApproveTask(user) && !isAssignee;
  const predecessorsDone = task.dependencies.every(
    (dependency) => dependency.dependsOnTask.status === "COMPLETED",
  );
  const ok = first(searchParams.ok);
  const error = first(searchParams.error);

  return (
    <>
      <Link
        href="/tasks"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-forest"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Kembali ke papan tugas
      </Link>

      {ok ? <AlertBanner tone="success">{ok}</AlertBanner> : null}
      {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}

      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest">
          Langkah #{task.stepNo.toString().padStart(2, "0")} ·{" "}
          {PHASE_META[task.phase]}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold leading-8 text-ink">{task.title}</h1>
          <TaskStatusBadge status={task.status} />
          {flag?.overdue && task.status !== "COMPLETED" ? (
            <span className="rounded-full bg-status-blocked-soft px-2.5 py-1 text-xs font-semibold text-status-blocked-text">
              Lewat deadline internal
            </span>
          ) : null}
          {flag?.atRisk && task.status !== "COMPLETED" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-status-blocked-soft px-2.5 py-1 text-xs font-semibold text-status-blocked-text">
              <AlertTriangle className="h-3 w-3" aria-hidden />
              Berisiko
            </span>
          ) : null}
        </div>
        {task.description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-muted">
            {task.description}
          </p>
        ) : null}
      </header>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <section className="card-surface p-4 sm:p-5">
            <h2 className="mb-3 font-heading text-base font-bold text-ink">
              Ringkasan tugas
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  Penanggung jawab
                </dt>
                <dd className="mt-1.5 flex items-center gap-2">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{ backgroundColor: task.assignedUser.avatarColor }}
                  >
                    {initials(task.assignedUser.name)}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">
                      {task.assignedUser.name}
                    </span>
                    <span className="block text-[11px] text-ink-muted">
                      {task.assignedUser.role.name}
                    </span>
                  </span>
                </dd>
              </div>

              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  PIC cadangan
                </dt>
                <dd className="mt-1.5 text-sm font-medium text-ink">
                  {task.backupUser ? (
                    <span className="flex items-center gap-2">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white"
                        style={{ backgroundColor: task.backupUser.avatarColor }}
                      >
                        {initials(task.backupUser.name)}
                      </span>
                      {task.backupUser.name}
                    </span>
                  ) : (
                    <span className="text-ink-muted">Belum ditentukan</span>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  Deadline internal
                </dt>
                <dd
                  className={cn(
                    "mt-1 text-sm font-semibold tabular",
                    flag?.overdue && task.status !== "COMPLETED"
                      ? "text-status-blocked-text"
                      : "text-ink",
                  )}
                >
                  {formatDate(task.internalDeadline)}
                  <span className="ml-2 text-xs font-normal text-ink-muted">
                    {task.status === "COMPLETED"
                      ? ""
                      : `(${relativeDeadline(task.internalDeadline)})`}
                  </span>
                </dd>
              </div>

              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  Deadline resmi
                </dt>
                <dd className="mt-1 text-sm font-semibold tabular text-ink">
                  {formatDate(task.officialDeadline)}
                </dd>
              </div>

              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  Deliverable terkini
                </dt>
                <dd className="mt-1 text-sm">
                  {task.deliverableUrl ? (
                    <a
                      href={task.deliverableUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 font-semibold text-forest underline decoration-sage-600 underline-offset-2 hover:text-forest-700"
                    >
                      <Link2 className="h-3.5 w-3.5" aria-hidden />
                      Buka tautan
                    </a>
                  ) : (
                    <span className="text-ink-muted">Belum ada</span>
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                  Terakhir diperbarui
                </dt>
                <dd className="mt-1 text-sm tabular text-ink">
                  {formatDateTime(task.updatedAt)}
                </dd>
              </div>
            </dl>

            {task.status === "BLOCKED" && task.blockedReason ? (
              <div className="mt-4 rounded-lg border border-status-blocked-solid/30 bg-status-blocked-soft p-3 text-sm text-status-blocked-text">
                <p className="flex items-center gap-1.5 font-semibold">
                  <Ban className="h-4 w-4" aria-hidden />
                  Hambatan aktif
                </p>
                <p className="mt-1">{task.blockedReason}</p>
              </div>
            ) : null}
          </section>

          <section className="card-surface p-4 sm:p-5">
            <h2 className="mb-3 font-heading text-base font-bold text-ink">
              Aksi tugas
            </h2>

            {!isMember ? (
              <p className="rounded-lg bg-cream p-3 text-sm text-ink-muted">
                Mode observer: Anda dapat melihat riwayat dan deliverable, tetapi
                tidak dapat mengubah status.
              </p>
            ) : (
              <div className="space-y-3">
                {task.status === "NOT_STARTED" ? (
                  <div>
                    <form action={changeTaskStatus}>
                      <HiddenTask taskId={task.id} intent="start" />
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={!predecessorsDone}
                      >
                        <Play className="h-4 w-4" aria-hidden />
                        Mulai kerjakan
                      </button>
                    </form>
                    {!predecessorsDone ? (
                      <p className="mt-2 text-xs text-status-blocked-text">
                        Semua tugas prasyarat harus selesai sebelum tugas ini dapat
                        dimulai.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {task.status === "IN_PROGRESS" ? (
                  <div className="flex flex-wrap items-start gap-3">
                    <form action={changeTaskStatus}>
                      <HiddenTask taskId={task.id} intent="review" />
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={!task.deliverableUrl}
                      >
                        <Send className="h-4 w-4" aria-hidden />
                        Ajukan review
                      </button>
                    </form>
                    {!task.deliverableUrl ? (
                      <p className="text-xs text-ink-muted">
                        Unggah deliverable terlebih dahulu.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {task.status === "UNDER_REVIEW" ? (
                  canApprove ? (
                    <div className="space-y-3">
                      <form action={changeTaskStatus}>
                        <HiddenTask taskId={task.id} intent="approve" />
                        <button type="submit" className="btn-primary">
                          <ShieldCheck className="h-4 w-4" aria-hidden />
                          Setujui & selesaikan
                        </button>
                      </form>

                      <details className="rounded-lg border border-cream-line bg-cream/60 p-3">
                        <summary className="cursor-pointer text-xs font-semibold text-ink">
                          Kembalikan untuk revisi
                        </summary>
                        <form action={changeTaskStatus} className="mt-3 space-y-2">
                          <HiddenTask taskId={task.id} intent="reject" />
                          <label htmlFor="reject-note" className="label-base">
                            Catatan revisi
                          </label>
                          <textarea
                            id="reject-note"
                            name="note"
                            rows={2}
                            className="input-base"
                            placeholder="Apa yang perlu diperbaiki?"
                          />
                          <button type="submit" className="btn-secondary">
                            <XCircle className="h-4 w-4" aria-hidden />
                            Kembalikan
                          </button>
                        </form>
                      </details>
                    </div>
                  ) : (
                    <p className="rounded-lg bg-cream p-3 text-sm text-ink-muted">
                      Menunggu review PM atau QC.
                      {isAssignee
                        ? " PIC tidak dapat menyetujui pekerjaannya sendiri."
                        : ""}
                    </p>
                  )
                ) : null}

                {task.status === "BLOCKED" ? (
                  <form action={changeTaskStatus} className="space-y-2">
                    <HiddenTask taskId={task.id} intent="unblock" />
                    <label htmlFor="unblock-note" className="label-base">
                      Catatan penyelesaian <span className="font-normal normal-case">(opsional)</span>
                    </label>
                    <input
                      id="unblock-note"
                      name="note"
                      className="input-base"
                      placeholder="Contoh: aset sudah diterima"
                    />
                    <button type="submit" className="btn-primary">
                      <RotateCcw className="h-4 w-4" aria-hidden />
                      Lepas hambatan
                    </button>
                  </form>
                ) : null}

                {task.status !== "COMPLETED" && task.status !== "BLOCKED" ? (
                  <details className="rounded-lg border border-status-blocked-solid/30 bg-status-blocked-soft/40 p-3">
                    <summary className="cursor-pointer text-xs font-semibold text-status-blocked-text">
                      Laporkan hambatan
                    </summary>
                    <form action={changeTaskStatus} className="mt-3 space-y-2">
                      <HiddenTask taskId={task.id} intent="block" />
                      <label htmlFor="block-note" className="label-base">
                        Alasan hambatan
                      </label>
                      <textarea
                        id="block-note"
                        name="note"
                        rows={2}
                        required
                        className="input-base"
                        placeholder="Jelaskan apa yang menghambat pekerjaan ini"
                      />
                      <button type="submit" className="btn-danger">
                        <Ban className="h-4 w-4" aria-hidden />
                        Tandai terhambat
                      </button>
                    </form>
                  </details>
                ) : null}

                {task.status === "COMPLETED" ? (
                  <p className="flex items-center gap-1.5 rounded-lg bg-status-done-soft p-3 text-sm font-medium text-status-done-text">
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    Tugas selesai
                    {task.completedAt ? ` pada ${formatDateTime(task.completedAt)}` : ""}.
                  </p>
                ) : null}
              </div>
            )}
          </section>

          <section className="card-surface p-4 sm:p-5">
            <h2 className="mb-3 font-heading text-base font-bold text-ink">
              Riwayat status
            </h2>
            {task.statusHistory.length === 0 ? (
              <p className="text-sm text-ink-muted">Belum ada riwayat.</p>
            ) : (
              <ol className="space-y-3">
                {task.statusHistory.map((history) => (
                  <li key={history.id} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-forest" />
                    <div className="min-w-0 flex-1 border-b border-cream-line/60 pb-3 last:border-0 last:pb-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <TaskStatusBadge
                          status={history.toStatus}
                          withDot={false}
                          className="px-2 py-0.5 text-[10px]"
                        />
                        <span className="text-[11px] text-ink-muted">
                          {history.fromStatus
                            ? `dari ${history.fromStatus.toLowerCase().replaceAll("_", " ")}`
                            : "status awal"}
                        </span>
                        <span className="ml-auto text-[11px] tabular text-ink-muted">
                          {formatDateTime(history.changedAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-medium text-ink">
                        {history.changedBy.name}
                      </p>
                      {history.note ? (
                        <p className="mt-0.5 text-xs text-ink-muted">{history.note}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <section className="card-surface p-4">
            <h2 className="mb-3 font-heading text-base font-bold text-ink">
              Deliverable
            </h2>

            {isMember ? (
              <form action={uploadDeliverable} className="space-y-2.5">
                <input type="hidden" name="taskId" value={task.id} />
                <div>
                  <label htmlFor="deliverable-url" className="label-base">
                    Tautan berkas
                  </label>
                  <input
                    id="deliverable-url"
                    name="url"
                    type="url"
                    required
                    className="input-base"
                    placeholder="https://drive.google.com/..."
                    defaultValue={task.deliverableUrl ?? ""}
                  />
                </div>
                <div>
                  <label htmlFor="deliverable-type" className="label-base">
                    Jenis <span className="font-normal normal-case">(opsional)</span>
                  </label>
                  <input
                    id="deliverable-type"
                    name="type"
                    className="input-base"
                    placeholder="Figma, Drive, YouTube"
                  />
                </div>
                <button type="submit" className="btn-secondary w-full">
                  <Upload className="h-4 w-4" aria-hidden />
                  Unggah versi baru
                </button>
              </form>
            ) : null}

            <div className="mt-3 space-y-2">
              {task.deliverables.length === 0 ? (
                <p className="text-sm text-ink-muted">Belum ada deliverable.</p>
              ) : (
                task.deliverables.map((deliverable) => (
                  <a
                    key={deliverable.id}
                    href={deliverable.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg border border-cream-line p-2.5 hover:border-forest hover:bg-forest-50/40"
                  >
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                      <FileText className="h-3.5 w-3.5 text-forest" aria-hidden />
                      Versi {deliverable.version}
                      {deliverable.type ? (
                        <span className="rounded bg-sage/50 px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
                          {deliverable.type}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-ink-muted">
                      {deliverable.url}
                    </span>
                    <span className="mt-1 block text-[10px] text-ink-muted">
                      {deliverable.uploadedBy.name} ·{" "}
                      {formatDateTime(deliverable.createdAt)}
                    </span>
                  </a>
                ))
              )}
            </div>
          </section>

          <section className="card-surface p-4">
            <h2 className="mb-3 font-heading text-base font-bold text-ink">
              Ketergantungan
            </h2>

            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              Prasyarat
            </p>
            {task.dependencies.length === 0 ? (
              <p className="text-xs text-ink-muted">Tidak ada prasyarat.</p>
            ) : (
              <ul className="space-y-1.5">
                {task.dependencies.map((dependency) => (
                  <li key={dependency.id}>
                    <Link
                      href={`/tasks/${dependency.dependsOnTask.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-cream-line px-2.5 py-2 text-xs font-medium hover:border-forest"
                    >
                      <span className="truncate">
                        <span className="mr-1 font-mono text-[10px] text-ink-muted">
                          {dependency.dependsOnTask.stepNo.toString().padStart(2, "0")}
                        </span>
                        {dependency.dependsOnTask.title}
                      </span>
                      <TaskStatusBadge
                        status={dependency.dependsOnTask.status}
                        withDot={false}
                        className="shrink-0 px-1.5 py-0.5 text-[10px]"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <p className="mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              Tugas lanjutan
            </p>
            {task.dependents.length === 0 ? (
              <p className="text-xs text-ink-muted">Tidak ada tugas lanjutan.</p>
            ) : (
              <ul className="space-y-1.5">
                {task.dependents.map((dependent) => (
                  <li key={dependent.id}>
                    <Link
                      href={`/tasks/${dependent.task.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-cream-line px-2.5 py-2 text-xs font-medium hover:border-forest"
                    >
                      <span className="truncate">
                        <span className="mr-1 font-mono text-[10px] text-ink-muted">
                          {dependent.task.stepNo.toString().padStart(2, "0")}
                        </span>
                        {dependent.task.title}
                      </span>
                      <TaskStatusBadge
                        status={dependent.task.status}
                        withDot={false}
                        className="shrink-0 px-1.5 py-0.5 text-[10px]"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-card border border-sage-600/50 bg-sage/25 p-4">
            <h2 className="flex items-center gap-1.5 font-heading text-xs font-bold uppercase tracking-wide text-forest">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              Aturan tugas
            </h2>
            <ul className="mt-2 space-y-1.5 text-xs leading-5 text-ink-muted">
              <li>• Deadline internal harus lebih awal dari deadline resmi.</li>
              <li>• Tugas selesai wajib memiliki tautan deliverable.</li>
              <li>• PIC tidak boleh menyetujui pekerjaannya sendiri.</li>
              <li>• Persetujuan hanya oleh PM atau QC.</li>
              <li>• Semua prasyarat harus selesai sebelum tugas dimulai.</li>
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
