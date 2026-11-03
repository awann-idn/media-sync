import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from "lucide-react";

import { cn } from "~/lib/utils";
import type { AttentionItem } from "~/server/queries/dashboard";

const toneMeta = {
  blocked: {
    icon: AlertTriangle,
    label: "text-status-blocked-text",
    bg: "bg-status-blocked-soft",
  },
  doing: {
    icon: CalendarClock,
    label: "text-status-doing-text",
    bg: "bg-status-doing-soft",
  },
  review: {
    icon: Clock,
    label: "text-status-review-text",
    bg: "bg-status-review-soft",
  },
  done: {
    icon: CheckCircle2,
    label: "text-status-done-text",
    bg: "bg-status-done-soft",
  },
  idle: {
    icon: ShieldAlert,
    label: "text-status-idle-text",
    bg: "bg-status-idle-soft",
  },
} as const;

export function AttentionFeed({ items }: { items: AttentionItem[] }) {
  return (
    <section className="card-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-heading text-base font-bold text-ink">
            Perlu perhatian
          </h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Fakta yang membutuhkan tindak lanjut, bukan penilaian pribadi.
          </p>
        </div>
        <span className="rounded-full bg-forest-50 px-2 py-0.5 text-[11px] font-semibold tabular text-forest">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-cream-line px-4 py-8 text-center">
          <CheckCircle2 className="mx-auto h-6 w-6 text-status-done-solid" />
          <p className="mt-2 text-sm font-medium text-ink">
            Tidak ada yang mendesak
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            Semua tugas dan keputusan berjalan sesuai rencana.
          </p>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-cream-line/70">
          {items.map((item) => {
            const meta = toneMeta[item.tone];
            const Icon = meta.icon;
            const content = (
              <>
                <span
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                    meta.bg,
                    meta.label,
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wide",
                      meta.label,
                    )}
                  >
                    {item.label}
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-semibold text-ink">
                    {item.title}
                  </span>
                  {item.detail ? (
                    <span className="mt-0.5 block text-[11px] leading-4 text-ink-muted">
                      {item.detail}
                    </span>
                  ) : null}
                </span>
              </>
            );

            return (
              <li key={item.id}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="-mx-2 flex gap-2.5 rounded-lg px-2 py-2.5 hover:bg-forest-50/60"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="flex gap-2.5 py-2.5">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
