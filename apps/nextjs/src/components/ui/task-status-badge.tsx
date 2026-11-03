import { TASK_STATUS_META, type TaskStatus } from "@mediasync/shared";

import { StatusBadge } from "~/components/ui/status-badge";

export function TaskStatusBadge({
  status,
  withDot = true,
  className,
}: {
  status: TaskStatus;
  withDot?: boolean;
  className?: string;
}) {
  const meta = TASK_STATUS_META[status];
  return (
    <StatusBadge tone={meta.tone} withDot={withDot} className={className}>
      {meta.label}
    </StatusBadge>
  );
}
