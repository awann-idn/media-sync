import { TASK_STATUS_META, type TaskStatus } from "@mediasync/shared";

import { cn } from "~/lib/utils";
import type { TaskFlags, TaskListItem } from "~/server/queries/tasks";
import { TaskCard } from "~/components/tasks/task-card";

const COLUMNS: { status: TaskStatus; accent: string }[] = [
  { status: "NOT_STARTED", accent: "bg-status-idle-solid" },
  { status: "IN_PROGRESS", accent: "bg-status-doing-solid" },
  { status: "UNDER_REVIEW", accent: "bg-status-review-solid" },
  { status: "COMPLETED", accent: "bg-status-done-solid" },
  { status: "BLOCKED", accent: "bg-status-blocked-solid" },
];

export function TaskBoard({
  tasks,
  flags,
}: {
  tasks: TaskListItem[];
  flags: Map<string, TaskFlags>;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div className="grid min-w-[1180px] grid-cols-5 gap-3">
        {COLUMNS.map((column) => {
          const items = tasks.filter((task) => task.status === column.status);
          return (
            <section
              key={column.status}
              className="flex flex-col rounded-card border border-cream-line bg-cream-card/60"
              aria-label={TASK_STATUS_META[column.status].label}
            >
              <header className="flex items-center justify-between gap-2 rounded-t-card border-b border-cream-line bg-paper px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", column.accent)} />
                  <h2 className="font-heading text-xs font-bold uppercase tracking-wide text-ink">
                    {TASK_STATUS_META[column.status].label}
                  </h2>
                </div>
                <span className="rounded-full bg-sage/50 px-2 py-0.5 text-[11px] font-semibold tabular text-ink-muted">
                  {items.length}
                </span>
              </header>

              <div className="flex flex-1 flex-col gap-2.5 p-2.5">
                {items.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-cream-line px-3 py-6 text-center text-xs text-ink-muted">
                    Tidak ada tugas
                  </p>
                ) : (
                  items.map((task) => (
                    <TaskCard key={task.id} task={task} flags={flags.get(task.id)} />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
