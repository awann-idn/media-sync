import { cn } from "~/lib/utils";

export type BadgeTone = "done" | "doing" | "blocked" | "idle" | "review";

const toneClasses: Record<BadgeTone, string> = {
  done: "border-status-done-solid/30 bg-status-done-soft text-status-done-text",
  doing: "border-status-doing-solid/30 bg-status-doing-soft text-status-doing-text",
  blocked:
    "border-status-blocked-solid/30 bg-status-blocked-soft text-status-blocked-text",
  idle: "border-status-idle-solid/30 bg-status-idle-soft text-status-idle-text",
  review:
    "border-status-review-solid/30 bg-status-review-soft text-status-review-text",
};

const dotClasses: Record<BadgeTone, string> = {
  done: "bg-status-done-solid",
  doing: "bg-status-doing-solid",
  blocked: "bg-status-blocked-solid",
  idle: "bg-status-idle-solid",
  review: "bg-status-review-solid",
};

export function StatusBadge({
  tone,
  children,
  className,
  withDot = true,
}: {
  tone: BadgeTone;
  children: React.ReactNode;
  className?: string;
  withDot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        toneClasses[tone],
        className,
      )}
    >
      {withDot ? (
        <span className={cn("h-1.5 w-1.5 rounded-full", dotClasses[tone])} />
      ) : null}
      {children}
    </span>
  );
}
