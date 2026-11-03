import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileDown,
  GitBranch,
  Lock,
  ShieldAlert,
} from "lucide-react";
import {
  CONFLICT_LEVEL_META,
  CONFLICT_TYPE_META,
} from "@mediasync/shared";

import { AlertBanner } from "~/components/ui/alert-banner";
import { StatusBadge } from "~/components/ui/status-badge";
import { formatDateTime } from "~/lib/format";
import { cn } from "~/lib/utils";
import { isPM, isObserver, requireUser } from "~/server/auth";
import {
  advanceConflict,
  resolveConflict,
  saveConflictRequest,
} from "~/server/actions/conflicts";
import { getConflictDetail } from "~/server/queries/conflicts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Detail konflik",
};

interface PageProps {
  params: { id: string };
  searchParams: { ok?: string; error?: string };
}

const STATUS_META = {
  OPEN: { tone: "doing" as const, label: "Terbuka" },
  IN_PROGRESS: { tone: "doing" as const, label: "Sedang ditangani" },
  ESCALATED: { tone: "blocked" as const, label: "Eskalasi ke dosen" },
  RESOLVED: { tone: "done" as const, label: "Selesai" },
};

export default async function ConflictDetailPage({
  params,
  searchParams,
}: PageProps) {
  const user = await requireUser();
  const { conflict, meetings } = await getConflictDetail(
    params.id,
    user.projectId,
  );

  if (!conflict) notFound();

  const pm = isPM(user);
  const observer = isObserver(user);
  const status = STATUS_META[conflict.status];
  const resolved = conflict.status === "RESOLVED";
  const nextLevel = conflict.level + 1;
  const canAdvance = pm && !resolved && conflict.level < 4;
  const reminder =
    conflict.level === 1 &&
    (conflict.status === "OPEN" || conflict.status === "IN_PROGRESS") &&
    Date.now() - new Date(conflict.createdAt).getTime() > 48 * 60 * 60 * 1000;

  return (
    <div className="space-y-5">
      <Link
        href="/conflicts"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-forest hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Kembali ke daftar konflik
      </Link>

      {searchParams.error ? (
        <AlertBanner tone="error">{searchParams.error}</AlertBanner>
      ) : null}
      {searchParams.ok ? (
        <AlertBanner tone="success">{searchParams.ok}</AlertBanner>
      ) : null}

      <header className="card-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge tone="review" withDot={false}>
                {CONFLICT_TYPE_META[conflict.type]}
              </StatusBadge>
              <StatusBadge tone={status.tone}>
                {status.label}
              </StatusBadge>
              <StatusBadge tone="idle" withDot={false}>
                {CONFLICT_LEVEL_META[
                  conflict.level as keyof typeof CONFLICT_LEVEL_META
                ]}
              </StatusBadge>
              {reminder ? (
                <StatusBadge tone="blocked">Pengingat 48 jam</StatusBadge>
              ) : null}
            </div>
            <h1 className="mt-2 font-heading text-xl font-bold text-ink">
              {conflict.title}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Dibuka oleh {conflict.openedBy.name} ·{" "}
              {formatDateTime(conflict.createdAt)}
              {conflict.escalatedAt
                ? ` · dieskalasi ${formatDateTime(conflict.escalatedAt)}`
                : ""}
              {conflict.resolvedAt
                ? ` · selesai ${formatDateTime(conflict.resolvedAt)}`
                : ""}
            </p>
          </div>
          <Link
            href={`/conflicts/${conflict.id}/pack`}
            className="btn-secondary"
          >
            <FileDown className="mr-1.5 h-4 w-4" aria-hidden />
            Escalation Pack
          </Link>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-muted">
          {conflict.description}
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          <section className="card-surface p-5">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
              <GitBranch className="h-4 w-4 text-forest" aria-hidden />
              Kronologi langkah
            </h2>
            <ol className="mt-4 space-y-4">
              {conflict.steps.map((step) => (
                <li key={step.id} className="relative border-l border-cream-line pl-5">
                  <span className="absolute -left-1.5 top-1 h-3 w-3 rounded-full border-2 border-cream bg-forest" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-forest">
                      {CONFLICT_LEVEL_META[
                        step.level as keyof typeof CONFLICT_LEVEL_META
                      ]}
                    </span>
                    <span className="text-xs text-ink-muted">
                      {formatDateTime(step.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink">
                    {step.summary}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Dicatat oleh {step.decidedBy?.name ?? "sistem"}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section className="card-surface p-5">
            <h2 className="text-sm font-semibold text-ink">
              Permintaan spesifik ke dosen
            </h2>
            {conflict.summary ? (
              <p className="mt-2 whitespace-pre-wrap rounded-lg bg-cream/50 p-3 text-sm leading-6 text-ink">
                {conflict.summary}
              </p>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">
                Belum diisi. Permintaan ini akan muncul di Escalation Pack agar
                dosen tahu keputusan atau bantuan apa yang dibutuhkan.
              </p>
            )}
            {pm && !resolved ? (
              <form action={saveConflictRequest} className="mt-3 space-y-2">
                <input
                  type="hidden"
                  name="conflictId"
                  value={conflict.id}
                />
                <label htmlFor="summary" className="label-base">
                  Perbarui permintaan
                </label>
                <textarea
                  id="summary"
                  name="summary"
                  rows={3}
                  className="input-base"
                  minLength={10}
                  required
                  defaultValue={conflict.summary ?? ""}
                  placeholder="Contoh: Kami meminta dosen memutuskan apakah arah visual A atau B yang dipakai, karena skor keduanya berbeda kurang dari 5 poin."
                />
                <button type="submit" className="btn-secondary">
                  Simpan permintaan
                </button>
              </form>
            ) : null}
          </section>
        </div>

        <div className="space-y-5">
          <section className="card-surface p-5">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
              <ShieldAlert className="h-4 w-4 text-forest" aria-hidden />
              Tindakan
            </h2>

            {resolved ? (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-status-done-text">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Konflik sudah diselesaikan.
              </p>
            ) : null}

            {!resolved && !pm && !observer ? (
              <p className="mt-2 text-sm text-ink-muted">
                Hanya PM yang dapat menaikkan level atau menutup konflik. Semua
                anggota dapat membuka konflik baru.
              </p>
            ) : null}

            {observer ? (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-ink-muted">
                <Lock className="h-4 w-4" aria-hidden />
                Mode observer read-only.
              </p>
            ) : null}

            {canAdvance ? (
              <form action={advanceConflict} className="mt-3 space-y-3">
                <input type="hidden" name="conflictId" value={conflict.id} />
                <div>
                  <label htmlFor="summary" className="label-base">
                    Ringkasan langkah Level {nextLevel}
                  </label>
                  <textarea
                    id="summary"
                    name="summary"
                    rows={4}
                    className="input-base"
                    minLength={10}
                    required
                    placeholder={
                      nextLevel === 2
                        ? "Bandingkan opsi dengan kriteria objektif dan hasil diskusi langsung."
                        : nextLevel === 3
                          ? "Alasan prosedural keputusan PM. PM tidak menilai selera atau aspek teknis."
                          : "Alasan eskalasi ke dosen dan bantuan yang diminta."
                    }
                  />
                </div>

                {nextLevel === 2 ? (
                  <div>
                    <label htmlFor="meetingId" className="label-base">
                      Rapat tercatat sebagai dasar
                    </label>
                    <select
                      id="meetingId"
                      name="meetingId"
                      className="input-base"
                      required
                    >
                      <option value="">Pilih rapat selesai</option>
                      {meetings.map((meeting) => (
                        <option key={meeting.id} value={meeting.id}>
                          {meeting.title} · {formatDateTime(meeting.scheduledAt)}
                        </option>
                      ))}
                    </select>
                    {meetings.length === 0 ? (
                      <p className="mt-1 text-xs text-status-blocked-text">
                        Belum ada rapat selesai. Catat dan tutup rapat terlebih
                        dahulu.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={nextLevel === 2 && meetings.length === 0}
                >
                  <ArrowRight className="mr-1.5 h-4 w-4" aria-hidden />
                  Naikkan ke Level {nextLevel}
                </button>
              </form>
            ) : null}

            {canAdvance && conflict.level === 4 ? (
              <p className="mt-2 text-xs text-ink-muted">
                Sudah di level maksimum. Tunggu keputusan dosen lalu tandai
                selesai.
              </p>
            ) : null}

            {pm && !resolved ? (
              <form
                action={resolveConflict}
                className="mt-4 space-y-2 border-t border-cream-line pt-4"
              >
                <input type="hidden" name="conflictId" value={conflict.id} />
                <label htmlFor="resolve-summary" className="label-base">
                  Catatan penyelesaian
                </label>
                <textarea
                  id="resolve-summary"
                  name="summary"
                  rows={3}
                  className="input-base"
                  minLength={10}
                  required
                  placeholder="Tuliskan kesepakatan akhir dan tindakan pencegahan."
                />
                <button type="submit" className="btn-secondary w-full">
                  Tandai konflik selesai
                </button>
              </form>
            ) : null}
          </section>

          <section className="card-surface p-5">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
              <AlertTriangle className="h-4 w-4 text-forest" aria-hidden />
              Aturan eskalasi
            </h2>
            <ul className="mt-2 space-y-2 text-xs leading-5 text-ink-muted">
              <li>Level 1: diskusi langsung maksimal 48 jam.</li>
              <li>
                Level 2: perbandingan terstruktur dengan kriteria objektif di
                rapat tercatat. Purwarupa boleh dipakai.
              </li>
              <li>
                Level 3: PM memutuskan secara prosedural dengan alasan tertulis.
              </li>
              <li>
                Level 4: dosen menerima Escalation Pack yang bisa dicetak.
              </li>
              <li className={cn(conflict.level >= 2 && "font-semibold text-ink")}>
                Deadlock keputusan dua kali otomatis membuka konflik Level 2
                visual.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
