import Link from "next/link";
import { AlertTriangle, Calendar, Clock } from "lucide-react";

import { daysUntil, formatDate } from "~/lib/format";
import { cn, initials } from "~/lib/utils";
import type { TaskFlags, TaskListItem } from "~/server/queries/tasks";
import { TaskStatusBadge } from "~/components/ui/task-status-badge";

export function TaskCard({
  task,
  flags,
}: {
  task: TaskListItem;
  flags?: TaskFlags;
}) {
  const daysLeft = daysUntil(task.internalDeadline);
  const isCompleted = task.status === "COMPLETED";

  const totalDeps = task.dependencies.length;
  const completedDeps = task.dependencies.filter(
    (dependency) => dependency.dependsOnTask.status === "COMPLETED",
  ).length;
  const allDepsDone = totalDeps === 0 || totalDeps === completedDeps;

  return (
    <Link
      href={`/tasks/${task.id}`}
      className={cn(
        "group block rounded-card border bg-paper p-3.5 shadow-sm transition hover:border-forest hover:shadow-md",
        flags?.atRisk && !isCompleted && "border-status-blocked-solid/40 bg-status-blocked-soft/20",
        task.status === "BLOCKED" && "border-status-blocked-solid",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-ink-muted">
          Langkah #{task.stepNo.toString().padStart(2, "0")}
        </span>
        <TaskStatusBadge status={task.status} />
      </div>

      <h4 className="mt-1.5 font-heading text-sm font-bold text-ink transition group-hover:text-forest">
        {task.title}
      </h4>

      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-ink-muted">
          {task.description}
        </p>
      )}

      {/* Warnings & Risk */}
      {!isCompleted && (
        <div className="mt-2 space-y-1">
          {flags?.atRisk && (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-status-blocked-text">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>Berisiko terhambat</span>
            </div>
          )}
          {task.status === "BLOCKED" && task.blockedReason && (
            <div className="rounded-md bg-status-blocked-soft p-1.5 text-[11px] font-medium text-status-blocked-text">
              Hambatan: {task.blockedReason}
            </div>
          )}
          {!allDepsDone && task.status !== "BLOCKED" && (
            <div className="flex items-center gap-1 text-[11px] text-ink-muted">
              <Clock className="h-3 w-3 shrink-0" />
              <span>
                Prasyarat: {completedDeps}/{totalDeps} selesai
              </span>
            </div>
          )}
        </div>
      )}

      {/* Footer: Assignee & Deadline */}
      <div className="mt-3 flex items-center justify-between border-t border-cream-line/60 pt-2.5 text-xs">
        <div className="flex items-center gap-1.5">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-xs"
            style={{ backgroundColor: task.assignedUser.avatarColor }}
            title={`${task.assignedUser.name} (${task.assignedUser.role.code})`}
          >
            {initials(task.assignedUser.name)}
          </div>
          <span className="max-w-[100px] truncate font-medium text-ink">
            {task.assignedUser.name}
          </span>
          <span className="font-mono text-[10px] text-ink-muted">
            [{task.assignedUser.role.code}]
          </span>
        </div>

        <div
          className={cn(
            "flex items-center gap-1 text-[11px] tabular-nums",
            flags?.overdue
              ? "font-semibold text-status-blocked-text"
              : flags?.dueSoon
                ? "font-semibold text-status-doing-text"
                : "text-ink-muted",
          )}
          title={`Internal: ${formatDate(task.internalDeadline)} | Resmi: ${formatDate(task.officialDeadline)}`}
        >
          <Calendar className="h-3 w-3" />
          <span>
            {isCompleted
              ? "Selesai"
              : flags?.overdue
                ? "Terlewat"
                : daysLeft === 0
                  ? "Hari ini"
                  : daysLeft > 0
                    ? `${daysLeft}h`
                    : formatDate(task.internalDeadline)}
          </span>
        </div>
      </div>
    </Link>
  );
}
