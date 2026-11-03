import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { PHASE_META } from "@mediasync/shared";

import { formatDate } from "~/lib/format";
import { initials } from "~/lib/utils";
import type { TaskFlags, TaskListItem } from "~/server/queries/tasks";
import { TaskStatusBadge } from "~/components/ui/task-status-badge";

export function TaskTable({
  tasks,
  flags,
}: {
  tasks: TaskListItem[];
  flags: Map<string, TaskFlags>;
}) {
  return (
    <div className="card-surface overflow-x-auto">
      <table className="table-base min-w-[920px]">
        <thead>
          <tr>
            <th className="w-14">No</th>
            <th>Tugas</th>
            <th>Fase</th>
            <th>PIC</th>
            <th>Deadline internal</th>
            <th>Deadline resmi</th>
            <th>Status</th>
            <th>Risiko</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const taskFlags = flags.get(task.id);
            return (
              <tr key={task.id} className="hover:bg-forest-50/50">
                <td className="font-mono text-xs text-ink-muted">
                  {task.stepNo.toString().padStart(2, "0")}
                </td>
                <td>
                  <Link
                    href={`/tasks/${task.id}`}
                    className="font-semibold text-ink hover:text-forest"
                  >
                    {task.title}
                  </Link>
                  {task.blockedReason ? (
                    <p className="mt-0.5 max-w-xs text-xs text-status-blocked-text">
                      {task.blockedReason}
                    </p>
                  ) : null}
                </td>
                <td className="whitespace-nowrap text-xs text-ink-muted">
                  {PHASE_META[task.phase]}
                </td>
                <td>
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: task.assignedUser.avatarColor }}
                    >
                      {initials(task.assignedUser.name)}
                    </span>
                    <span className="text-xs font-medium">{task.assignedUser.name}</span>
                  </span>
                </td>
                <td className="whitespace-nowrap text-xs tabular text-ink-muted">
                  {formatDate(task.internalDeadline)}
                </td>
                <td className="whitespace-nowrap text-xs tabular text-ink-muted">
                  {formatDate(task.officialDeadline)}
                </td>
                <td>
                  <TaskStatusBadge status={task.status} />
                </td>
                <td>
                  {taskFlags?.atRisk && task.status !== "COMPLETED" ? (
                    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-status-blocked-soft px-2 py-1 text-[11px] font-semibold text-status-blocked-text">
                      <AlertTriangle className="h-3 w-3" />
                      Berisiko
                    </span>
                  ) : (
                    <span className="text-xs text-ink-muted">Aman</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
