import Link from "next/link";
import { AlertTriangle, LayoutGrid, List, Plus, Rows3 } from "lucide-react";

import { PHASE_META, type TaskPhase } from "@mediasync/shared";

import { AlertBanner } from "~/components/ui/alert-banner";
import { EmptyState } from "~/components/ui/empty-state";
import { PageHeader } from "~/components/ui/page-header";
import { TaskBoard } from "~/components/tasks/task-board";
import { TaskFilters } from "~/components/tasks/task-filters";
import { TaskForm } from "~/components/tasks/task-form";
import { TaskTable } from "~/components/tasks/task-table";
import { TaskTimeline } from "~/components/tasks/task-timeline";
import { isPM, requireUser } from "~/server/auth";
import {
  computeTaskFlags,
  listProjectMembers,
  listTasks,
} from "~/server/queries/tasks";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

const VIEWS = [
  { id: "board", label: "Papan", icon: LayoutGrid },
  { id: "table", label: "Tabel", icon: List },
  { id: "timeline", label: "Linimasa", icon: Rows3 },
] as const;

export default async function TasksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const requestedView = first(searchParams.view);
  const view = VIEWS.some((item) => item.id === requestedView)
    ? requestedView
    : "board";
  const phaseFilter = first(searchParams.phase);
  const assigneeFilter = first(searchParams.assignee);
  const showForm = first(searchParams.new) === "1";
  const ok = first(searchParams.ok);
  const error = first(searchParams.error);

  const [allTasks, members] = await Promise.all([
    listTasks(user.projectId),
    listProjectMembers(user.projectId),
  ]);
  const flags = computeTaskFlags(allTasks);

  const tasks = allTasks.filter((task) => {
    if (phaseFilter && task.phase !== (phaseFilter as TaskPhase)) return false;
    if (assigneeFilter && task.assignedUserId !== assigneeFilter) return false;
    return true;
  });

  const riskyCount = tasks.filter(
    (task) => flags.get(task.id)?.atRisk && task.status !== "COMPLETED",
  ).length;
  const completedCount = tasks.filter((task) => task.status === "COMPLETED").length;
  const nextStep =
    allTasks.reduce((max, task) => Math.max(max, task.stepNo), 0) + 1;

  const viewQuery = new URLSearchParams();
  if (phaseFilter) viewQuery.set("phase", phaseFilter);
  if (assigneeFilter) viewQuery.set("assignee", assigneeFilter);

  function viewHref(nextView: string) {
    const params = new URLSearchParams(viewQuery);
    params.set("view", nextView);
    return `/tasks?${params.toString()}`;
  }

  return (
    <>
      <PageHeader
        eyebrow="M2 · Papan tugas"
        title="Tugas produksi"
        description="Pantau progres, ketergantungan, dan hambatan di satu tempat."
        actions={
          isPM(user) ? (
            <Link
              href={showForm ? "/tasks" : "/tasks?new=1"}
              className="btn-primary"
            >
              <Plus className="h-4 w-4" aria-hidden />
              {showForm ? "Tutup formulir" : "Tugas baru"}
            </Link>
          ) : null
        }
      />

      {ok ? <AlertBanner tone="success">{ok}</AlertBanner> : null}
      {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}

      {riskyCount > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-status-blocked-solid/30 bg-status-blocked-soft px-3.5 py-2.5 text-sm font-medium text-status-blocked-text">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            {riskyCount} tugas berisiko terkena dampak hambatan. Periksa jalur
            ketergantungan.
          </span>
          <span className="ml-auto rounded-full bg-white/60 px-2 py-0.5 text-xs tabular">
            {completedCount}/{tasks.length} selesai
          </span>
        </div>
      ) : null}

      {showForm && isPM(user) ? (
        <TaskForm members={members} nextStep={nextStep} />
      ) : null}
      {showForm && !isPM(user) ? (
        <AlertBanner tone="error">
          Hanya Project Manager yang dapat membuat tugas.
        </AlertBanner>
      ) : null}

      <TaskFilters
        view={view}
        phase={phaseFilter}
        assignee={assigneeFilter}
        members={members}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div
          role="tablist"
          aria-label="Tampilan tugas"
          className="inline-flex rounded-lg border border-cream-line bg-paper p-1"
        >
          {VIEWS.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <Link
                key={item.id}
                href={viewHref(item.id)}
                role="tab"
                aria-selected={active}
                className={
                  active
                    ? "inline-flex min-h-9 items-center gap-1.5 rounded-md bg-forest px-3 text-xs font-semibold text-cream-card"
                    : "inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-xs font-semibold text-ink-muted hover:bg-forest-50 hover:text-ink"
                }
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>

        <p className="text-xs text-ink-muted">
          {tasks.length} tugas
          {phaseFilter ? ` · ${PHASE_META[phaseFilter as TaskPhase] ?? phaseFilter}` : ""}
        </p>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          title="Tidak ada tugas yang cocok"
          description="Ubah filter atau buat tugas baru untuk memulai."
          action={
            <Link href="/tasks" className="btn-secondary">
              Hapus filter
            </Link>
          }
        />
      ) : view === "table" ? (
        <TaskTable tasks={tasks} flags={flags} />
      ) : view === "timeline" ? (
        <TaskTimeline tasks={tasks} flags={flags} />
      ) : (
        <TaskBoard tasks={tasks} flags={flags} />
      )}
    </>
  );
}
