import Link from "next/link";

import { formatDate } from "~/lib/format";
import { cn } from "~/lib/utils";
import type { TaskFlags, TaskListItem } from "~/server/queries/tasks";
import { TaskStatusBadge } from "~/components/ui/task-status-badge";

const DAY = 24 * 60 * 60 * 1000;

const barTone: Record<string, string> = {
  NOT_STARTED: "bg-status-idle-solid/70",
  IN_PROGRESS: "bg-status-doing-solid",
  UNDER_REVIEW: "bg-status-review-solid",
  COMPLETED: "bg-status-done-solid",
  BLOCKED: "bg-status-blocked-solid",
};

export function TaskTimeline({
  tasks,
  flags,
}: {
  tasks: TaskListItem[];
  flags: Map<string, TaskFlags>;
}) {
  const starts = tasks.map((task) => new Date(task.internalDeadline).getTime());
  const ends = tasks.map((task) => new Date(task.officialDeadline).getTime());
  const min = Math.min(...starts);
  const max = Math.max(...ends);
  const span = Math.max(max - min, DAY);
  const ticks = [0, 0.33, 0.66, 1].map((ratio) => new Date(min + span * ratio));

  return (
    <div className="card-surface overflow-x-auto p-4">
      <div className="min-w-[820px]">
        <div className="mb-3 grid grid-cols-[260px_1fr] items-end gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Linimasa tugas
          </p>
          <div className="relative h-5 text-[11px] text-ink-muted">
            {ticks.map((tick, index) => (
              <span
                key={index}
                className="absolute -translate-x-1/2 whitespace-nowrap tabular"
                style={{ left: `${index * 33.33}%` }}
              >
                {formatDate(tick)}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          {tasks.map((task) => {
            const start = new Date(task.internalDeadline).getTime();
            const end = new Date(task.officialDeadline).getTime();
            const left = ((start - min) / span) * 100;
            const width = Math.max(((end - start) / span) * 100, 1.5);
            const taskFlags = flags.get(task.id);

            return (
              <div
                key={task.id}
                className="grid grid-cols-[260px_1fr] items-center gap-3 rounded-lg px-1 py-1 hover:bg-forest-50/60"
              >
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <Link
                    href={`/tasks/${task.id}`}
                    className="truncate text-xs font-semibold text-ink hover:text-forest"
                    title={task.title}
                  >
                    <span className="mr-1 font-mono text-[10px] text-ink-muted">
                      {task.stepNo.toString().padStart(2, "0")}
                    </span>
                    {task.title}
                  </Link>
                  <TaskStatusBadge
                    status={task.status}
                    withDot={false}
                    className="shrink-0 px-2 py-0.5 text-[10px]"
                  />
                </div>

                <div className="relative h-7 rounded bg-sage/25">
                  <div
                    className={cn(
                      "absolute inset-y-1 rounded-sm opacity-90",
                      barTone[task.status],
                      taskFlags?.atRisk && task.status !== "COMPLETED" && "ring-2 ring-status-blocked-solid/50",
                    )}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    title={`${formatDate(task.internalDeadline)} – ${formatDate(task.officialDeadline)}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-[11px] text-ink-muted">
          Batang menunjukkan rentang deadline internal sampai deadline resmi. Garis merah
          menandai tugas berisiko.
        </p>
      </div>
    </div>
  );
}
