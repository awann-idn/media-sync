import type { TaskStatus } from "@mediasync/shared";

import type { TaskFlags, TaskListItem } from "~/server/queries/tasks";

const COLORS: Record<
  TaskStatus,
  { fill: string; stroke: string; text: string; solid: string }
> = {
  NOT_STARTED: {
    fill: "#E6EBE6",
    stroke: "#9AA89F",
    text: "#3E4A43",
    solid: "#9AA89F",
  },
  IN_PROGRESS: {
    fill: "#FBEFC8",
    stroke: "#E8B84A",
    text: "#7A5A00",
    solid: "#E8B84A",
  },
  UNDER_REVIEW: {
    fill: "#DCEAEF",
    stroke: "#6E9AA8",
    text: "#2C5563",
    solid: "#6E9AA8",
  },
  COMPLETED: {
    fill: "#DDF1E6",
    stroke: "#4FB286",
    text: "#1F6B4A",
    solid: "#4FB286",
  },
  BLOCKED: {
    fill: "#F8DADD",
    stroke: "#D9626B",
    text: "#9B2C36",
    solid: "#D9626B",
  },
};

const NODE_WIDTH = 128;
const NODE_GAP = 32;
const STEP = NODE_WIDTH + NODE_GAP;
const PAD = 20;

function truncate(text: string, max = 17): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function DependencyFlow({
  tasks,
  flags,
}: {
  tasks: TaskListItem[];
  flags: Map<string, TaskFlags>;
}) {
  const width = Math.max(tasks.length * STEP + PAD * 2, 640);

  return (
    <div className="overflow-x-auto">
      <svg
        width={width}
        height={150}
        viewBox={`0 0 ${width} 150`}
        role="img"
        aria-label="Alur ketergantungan tugas"
        className="max-w-none"
      >
        {tasks.map((task, index) => {
          const x = PAD + index * STEP;
          const colors = COLORS[task.status];
          const atRisk = flags.get(task.id)?.atRisk && task.status !== "COMPLETED";
          const next = tasks[index + 1];

          return (
            <g key={task.id}>
              {next ? (
                <line
                  x1={x + NODE_WIDTH}
                  y1={80}
                  x2={x + STEP}
                  y2={80}
                  stroke={
                    flags.get(next.id)?.atRisk ? "#D9626B" : "#D9D2BC"
                  }
                  strokeWidth={2}
                  strokeDasharray={flags.get(next.id)?.atRisk ? "4 3" : undefined}
                />
              ) : null}

              <a href={`/tasks/${task.id}`} aria-label={`${task.title}, ${task.status}`}>
                <g>
                  <rect
                    x={x}
                    y={44}
                    width={NODE_WIDTH}
                    height={72}
                    rx={10}
                    fill={colors.fill}
                    stroke={atRisk ? "#D9626B" : colors.stroke}
                    strokeWidth={atRisk ? 2 : 1.5}
                  />
                  <text
                    x={x + 10}
                    y={62}
                    fontFamily="ui-monospace, monospace"
                    fontSize="9"
                    fontWeight="700"
                    fill={colors.text}
                    opacity="0.8"
                  >
                    #{task.stepNo.toString().padStart(2, "0")}
                  </text>
                  <text
                    x={x + NODE_WIDTH - 10}
                    y={62}
                    textAnchor="end"
                    fontFamily="Inter, sans-serif"
                    fontSize="9"
                    fontWeight="700"
                    fill={colors.text}
                  >
                    {task.assignedUser.role.code}
                  </text>
                  <text
                    x={x + 10}
                    y={84}
                    fontFamily="Inter, sans-serif"
                    fontSize="11"
                    fontWeight="600"
                    fill={colors.text}
                  >
                    {truncate(task.title)}
                  </text>
                  <text
                    x={x + 10}
                    y={103}
                    fontFamily="Inter, sans-serif"
                    fontSize="9.5"
                    fill={colors.text}
                    opacity="0.85"
                  >
                    {truncate(task.assignedUser.name, 18)}
                  </text>
                  {atRisk ? (
                    <circle cx={x + NODE_WIDTH - 9} cy={53} r={3.5} fill="#D9626B" />
                  ) : null}
                </g>
              </a>
            </g>
          );
        })}
      </svg>

      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] text-ink-muted">
        {(
          ["NOT_STARTED", "IN_PROGRESS", "UNDER_REVIEW", "COMPLETED", "BLOCKED"] as TaskStatus[]
        ).map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: COLORS[status].solid }}
            />
            {status === "NOT_STARTED"
              ? "Belum mulai"
              : status === "IN_PROGRESS"
                ? "Dikerjakan"
                : status === "UNDER_REVIEW"
                  ? "Review"
                  : status === "COMPLETED"
                    ? "Selesai"
                    : "Terhambat"}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full border-2 border-status-blocked-solid" />
          Berisiko
        </span>
      </div>
    </div>
  );
}
