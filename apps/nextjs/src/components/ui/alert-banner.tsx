import { AlertCircle, CheckCircle2 } from "lucide-react";

import { cn } from "~/lib/utils";

export function AlertBanner({
  tone,
  children,
  className,
}: {
  tone: "success" | "error";
  children: React.ReactNode;
  className?: string;
}) {
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "mb-4 flex items-start gap-2 rounded-lg border px-3.5 py-3 text-sm font-medium",
        tone === "success"
          ? "border-status-done-solid/30 bg-status-done-soft text-status-done-text"
          : "border-status-blocked-solid/30 bg-status-blocked-soft text-status-blocked-text",
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
