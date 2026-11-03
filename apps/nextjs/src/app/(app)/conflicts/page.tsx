import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  GitBranch,
  Plus,
  ShieldAlert,
} from "lucide-react";
import {
  CONFLICT_LEVEL_META,
  CONFLICT_TYPE_META,
} from "@mediasync/shared";

import { AlertBanner } from "~/components/ui/alert-banner";
import { EmptyState } from "~/components/ui/empty-state";
import { MetricCard } from "~/components/ui/metric-card";
import { PageHeader } from "~/components/ui/page-header";
import { StatusBadge } from "~/components/ui/status-badge";
import { formatDateTime } from "~/lib/format";
import { cn } from "~/lib/utils";
import { isObserver, requireUser } from "~/server/auth";
import { openConflict } from "~/server/actions/conflicts";
import { getConflictsPage } from "~/server/queries/conflicts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Konflik & eskalasi",
};

interface PageProps {
  searchParams: { ok?: string; error?: string };
}

const STATUS_META = {
  OPEN: { tone: "doing" as const, label: "Terbuka" },
  IN_PROGRESS: { tone: "doing" as const, label: "Sedang ditangani" },
  ESCALATED: { tone: "blocked" as const, label: "Eskalasi" },
  RESOLVED: { tone: "done" as const, label: "Selesai" },
};

const CONFLICT_TYPES = Object.keys(CONFLICT_TYPE_META) as (keyof typeof CONFLICT_TYPE_META)[];

function ageLabel(hours: number) {
  if (hours < 48) return `${Math.max(1, Math.round(hours))} jam`;
  return `${Math.floor(hours / 24)} hari`;
}

export default async function ConflictsPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const data = await getConflictsPage(user.projectId);
  const observer = isObserver(user);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="M5 · Komunikasi"
        title="Konflik & eskalasi"
        description="Tangani konflik berjenjang: diskusi langsung, perbandingan terstruktur dengan kriteria objektif, keputusan prosedural PM, lalu eskalasi ke dosen dengan Escalation Pack."
      />

      {searchParams.error ? (
        <AlertBanner tone="error">{searchParams.error}</AlertBanner>
      ) : null}
      {searchParams.ok ? (
        <AlertBanner tone="success">{searchParams.ok}</AlertBanner>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total konflik"
          value={String(data.metrics.total)}
          hint={`${data.metrics.open} masih terbuka`}
          icon={<GitBranch className="h-4 w-4" />}
        />
        <MetricCard
          label="Perlu tindakan"
          value={String(data.metrics.open)}
          hint="Terbuka atau sedang ditangani"
          tone={data.metrics.open > 0 ? "doing" : "done"}
          icon={<ShieldAlert className="h-4 w-4" />}
        />
        <MetricCard
          label="Dieskalasi"
          value={String(data.metrics.escalated)}
          hint="Level 4 ke dosen"
          tone={data.metrics.escalated > 0 ? "blocked" : "done"}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <MetricCard
          label="Pengingat 48 jam"
          value={String(data.metrics.reminders)}
          hint="Level 1 melewati batas waktu"
          tone={data.metrics.reminders > 0 ? "blocked" : "done"}
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      <section className="card-surface p-5">
        <h2 className="text-sm font-semibold text-ink">Tangga penyelesaian</h2>
        <ol className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {([1, 2, 3, 4] as const).map((level) => (
            <li
              key={level}
              className={cn(
                "rounded-lg border p-3 text-xs leading-5",
                level === 4
                  ? "border-status-blocked-solid/30 bg-status-blocked-soft text-status-blocked-text"
                  : "border-cream-line bg-cream/40 text-ink-muted",
              )}
            >
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide">
                {CONFLICT_LEVEL_META[level]}
              </span>
              {level === 1
                ? "Diskusi langsung maksimal 48 jam, fokus fakta dan kendala."
                : level === 2
                  ? "Bandingkan opsi dengan kriteria objektif di rapat tercatat; boleh membuat purwarupa."
                  : level === 3
                    ? "PM memutuskan secara prosedural dengan alasan tertulis; tidak menilai selera."
                    : "Dosen menerima Escalation Pack: kronologi, keputusan, metrik, dan permintaan spesifik."}
            </li>
          ))}
        </ol>
      </section>

      {observer ? (
        <AlertBanner tone="success">
          Anda melihat sebagai observer. Konflik bersifat read-only.
        </AlertBanner>
      ) : (
        <details className="card-surface overflow-hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-sm font-semibold text-forest">
            <Plus className="h-4 w-4" aria-hidden />
            Buka konflik baru
          </summary>
          <form
            action={openConflict}
            className="grid gap-4 border-t border-cream-line px-5 py-4 lg:grid-cols-2"
          >
            <div>
              <label htmlFor="title" className="label-base">
                Judul konflik
              </label>
              <input
                id="title"
                name="title"
                className="input-base"
                minLength={5}
                required
                placeholder="Contoh: Aset grafis belum sesuai arah visual"
              />
            </div>
            <div>
              <label htmlFor="type" className="label-base">
                Jenis konflik
              </label>
              <select id="type" name="type" className="input-base" required>
                {CONFLICT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {CONFLICT_TYPE_META[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-2">
              <label htmlFor="description" className="label-base">
                Deskripsi
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="input-base"
                minLength={10}
                required
                placeholder="Tuliskan kejadian, pihak yang terlibat, dan dampaknya ke pekerjaan. Hindari menyerang pribadi."
              />
              <p className="mt-1 text-xs text-ink-muted">
                Jika jenis konflik yang sama sudah muncul tiga kali dalam tiga
                minggu, sistem menandainya sebagai konflik berulang.
              </p>
            </div>
            <div className="lg:col-span-2">
              <button type="submit" className="btn-primary">
                Catat konflik Level 1
              </button>
            </div>
          </form>
        </details>
      )}

      {data.conflicts.length === 0 ? (
        <EmptyState
          title="Belum ada konflik"
          description="Konflik yang dicatat akan tampil di sini beserta riwayat langkah penyelesaiannya."
        />
      ) : (
        <div className="space-y-3">
          {data.conflicts.map((conflict) => {
            const status = STATUS_META[conflict.status];
            return (
              <Link
                key={conflict.id}
                href={`/conflicts/${conflict.id}`}
                className={cn(
                  "card-surface block p-5 transition-colors hover:border-forest/40",
                  conflict.needsReminder && "border-status-blocked-solid/40",
                  conflict.recurring && "border-status-doing-solid/50",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge tone="review" withDot={false}>
                        {CONFLICT_TYPE_META[conflict.type]}
                      </StatusBadge>
                      <StatusBadge tone={status.tone} withDot={false}>
                        {status.label}
                      </StatusBadge>
                      <span className="text-xs font-medium text-ink-muted">
                        {CONFLICT_LEVEL_META[
                          conflict.level as keyof typeof CONFLICT_LEVEL_META
                        ]}
                      </span>
                      {conflict.recurring ? (
                        <StatusBadge tone="doing" withDot={false}>
                          Berulang · {conflict.recentTypeCount}x/3 minggu
                        </StatusBadge>
                      ) : null}
                    </div>
                    <h2 className="mt-2 font-heading text-base font-bold text-ink">
                      {conflict.title}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-ink-muted">
                      {conflict.description}
                    </p>
                    <p className="mt-2 text-xs text-ink-muted">
                      Dibuka oleh {conflict.openedBy.name} ·{" "}
                      {formatDateTime(conflict.createdAt)} · umur{" "}
                      {ageLabel(conflict.ageHours)} · {conflict.steps.length}{" "}
                      langkah tercatat
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {conflict.needsReminder ? (
                      <StatusBadge tone="blocked">
                        Pengingat 48 jam
                      </StatusBadge>
                    ) : null}
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-forest">
                      Lihat detail
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
