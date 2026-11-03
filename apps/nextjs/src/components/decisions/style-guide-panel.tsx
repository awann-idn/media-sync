import {
  FileLock2,
  Lock,
  MessageSquarePlus,
  Palette,
  ShieldCheck,
  Type,
  Volume2,
} from "lucide-react";

import {
  freezeStyleGuide,
  requestStyleChange,
  reviewStyleChange,
} from "~/server/actions/decisions";
import type { DecisionBoard } from "~/server/queries/decisions";

type StyleGuide = NonNullable<DecisionBoard["styleGuide"]>;

function list(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function ChangeStatus({ status }: { status: string }) {
  const className =
    status === "APPROVED"
      ? "bg-status-done-soft text-status-done-text"
      : status === "REJECTED"
        ? "bg-status-blocked-soft text-status-blocked-text"
        : "bg-status-doing-soft text-status-doing-text";
  const label =
    status === "APPROVED"
      ? "Disetujui"
      : status === "REJECTED"
        ? "Ditolak"
        : "Menunggu PM";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${className}`}>
      {label}
    </span>
  );
}

function ListBlock({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
}) {
  return (
    <div>
      <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-muted">
        {icon}
        {title}
      </h4>
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li key={item} className="text-sm leading-6 text-ink">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StyleGuidePanel({
  board,
  styleGuide,
  isMember,
  isPM,
}: {
  board: DecisionBoard;
  styleGuide: StyleGuide | null;
  isMember: boolean;
  isPM: boolean;
}) {
  const accepted = board.decisions.find(
    (decision) => decision.status === "ACCEPTED",
  );

  if (!styleGuide) {
    return (
      <section id="style-guide" className="card-surface p-5">
        <div className="flex items-start gap-2.5">
          <FileLock2 className="mt-0.5 h-5 w-5 shrink-0 text-forest" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-lg font-bold text-ink">
              Style guide beku
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Style guide belum dibekukan. Dokumen ini menjadi acuan wajib
              aset visual dan QC setelah keputusan desain diterima.
            </p>

            {accepted && isPM ? (
              <form action={freezeStyleGuide} className="mt-4 space-y-3">
                <input type="hidden" name="decisionId" value={accepted.id} />
                <p className="rounded-lg bg-cream/70 px-3 py-2 text-xs text-ink-muted">
                  Membekukan style guide untuk ide{" "}
                  <strong className="text-ink">{accepted.title}</strong>. Setelah
                  dibekukan, isi tidak dapat diubah; perubahan harus melalui
                  change request dan rapat tercatat.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="palette" className="label-base">
                      Palet warna (satu per baris)
                    </label>
                    <textarea
                      id="palette"
                      name="palette"
                      rows={4}
                      required
                      className="input-base"
                      defaultValue={"#2B4C3B\n#C2D5C4\n#FDF0D5\n#FFFBF1"}
                    />
                  </div>
                  <div>
                    <label htmlFor="typography" className="label-base">
                      Tipografi
                    </label>
                    <textarea
                      id="typography"
                      name="typography"
                      rows={4}
                      required
                      className="input-base"
                      defaultValue={
                        "Plus Jakarta Sans — judul\nInter — teks isi"
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor="layoutRules" className="label-base">
                      Aturan tata letak
                    </label>
                    <textarea
                      id="layoutRules"
                      name="layoutRules"
                      rows={3}
                      required
                      className="input-base"
                      defaultValue={
                        "Grid 12 kolom, margin 24px\nJudul rata kiri, kontras tinggi"
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor="audioRules" className="label-base">
                      Aturan audio
                    </label>
                    <textarea
                      id="audioRules"
                      name="audioRules"
                      rows={3}
                      required
                      className="input-base"
                      defaultValue={
                        "Musik hangat, volume -18 LUFS\nHindari treble tajam"
                      }
                    />
                  </div>
                </div>
                <button type="submit" className="btn-primary">
                  <Lock className="h-4 w-4" aria-hidden />
                  Bekukan style guide
                </button>
              </form>
            ) : (
              <p className="mt-3 rounded-lg bg-cream/70 px-3 py-2 text-xs text-ink-muted">
                {accepted
                  ? "Menunggu PM membekukan style guide."
                  : "Tetapkan keputusan desain terlebih dahulu sebelum membekukan style guide."}
              </p>
            )}
          </div>
        </div>
      </section>
    );
  }

  const palette = list(styleGuide.palette);
  const typography = list(styleGuide.typography);
  const layoutRules = list(styleGuide.layoutRules);
  const audioRules = list(styleGuide.audioRules);

  return (
    <section id="style-guide" className="card-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <ShieldCheck
            className="mt-0.5 h-5 w-5 shrink-0 text-status-done-text"
            aria-hidden
          />
          <div>
            <h2 className="font-heading text-lg font-bold text-ink">
              Style guide v{styleGuide.version}
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Dibekukan{" "}
              {styleGuide.frozenAt
                ? new Intl.DateTimeFormat("id-ID", {
                    dateStyle: "long",
                  }).format(styleGuide.frozenAt)
                : "—"}{" "}
              · acuan resmi QC
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-status-done-soft px-2.5 py-1 text-[11px] font-semibold text-status-done-text">
          <Lock className="h-3 w-3" aria-hidden />
          Read-only
        </span>
      </div>

      {styleGuide.decision ? (
        <p className="mt-2 text-xs text-ink-muted">
          Berdasarkan keputusan:{" "}
          <strong className="text-ink">{styleGuide.decision.title}</strong>
        </p>
      ) : null}

      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-muted">
            <Palette className="h-3.5 w-3.5" aria-hidden />
            Palet warna
          </h4>
          <ul className="mt-2 space-y-1.5">
            {palette.map((color) => (
              <li key={color} className="flex items-center gap-2 text-xs">
                <span
                  className="h-5 w-5 shrink-0 rounded border border-cream-line"
                  style={
                    /^#[0-9a-f]{3,8}$/i.test(color)
                      ? { backgroundColor: color }
                      : { backgroundColor: "#E6EBE6" }
                  }
                />
                <span className="font-mono text-[11px] text-ink">{color}</span>
              </li>
            ))}
          </ul>
        </div>
        <ListBlock
          title="Tipografi"
          icon={<Type className="h-3.5 w-3.5" aria-hidden />}
          items={typography}
        />
        <ListBlock
          title="Tata letak"
          icon={<FileLock2 className="h-3.5 w-3.5" aria-hidden />}
          items={layoutRules}
        />
        <ListBlock
          title="Audio"
          icon={<Volume2 className="h-3.5 w-3.5" aria-hidden />}
          items={audioRules}
        />
      </div>

      <div className="mt-6 border-t border-cream-line pt-5">
        <h3 className="flex items-center gap-1.5 font-heading text-sm font-bold text-ink">
          <MessageSquarePlus className="h-4 w-4 text-forest" aria-hidden />
          Permintaan perubahan
        </h3>
        <p className="mt-1 text-xs text-ink-muted">
          Style guide beku tidak dapat diedit langsung. Perubahan wajib
          diajukan melalui rapat yang tercatat dan disetujui PM.
        </p>

        {styleGuide.changeRequests.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {styleGuide.changeRequests.map((request) => (
              <li
                key={request.id}
                className="rounded-lg border border-cream-line bg-cream/40 px-3 py-2.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-ink">{request.description}</p>
                    <p className="mt-0.5 text-[11px] text-ink-muted">
                      {request.requestedBy.name} · rapat{" "}
                      {request.meeting?.title ?? "—"}
                      {request.approvedBy
                        ? ` · diputuskan ${request.approvedBy.name}`
                        : ""}
                    </p>
                  </div>
                  <ChangeStatus status={request.status} />
                </div>
                {isPM && request.status === "PENDING" ? (
                  <div className="mt-2 flex gap-2">
                    <form action={reviewStyleChange}>
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="decision" value="approve" />
                      <button type="submit" className="btn-secondary text-xs">
                        Setujui
                      </button>
                    </form>
                    <form action={reviewStyleChange}>
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="decision" value="reject" />
                      <button type="submit" className="btn-ghost text-xs">
                        Tolak
                      </button>
                    </form>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-ink-muted">
            Belum ada permintaan perubahan.
          </p>
        )}

        {isMember ? (
          <details className="mt-3 rounded-lg border border-cream-line bg-paper">
            <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-forest">
              Ajukan perubahan melalui rapat
            </summary>
            <form
              action={requestStyleChange}
              className="space-y-3 border-t border-cream-line p-3"
            >
              <input type="hidden" name="styleGuideId" value={styleGuide.id} />
              <div>
                <label htmlFor="meetingId" className="label-base">
                  Rujukan rapat <span className="text-status-blocked-text">*</span>
                </label>
                <select
                  id="meetingId"
                  name="meetingId"
                  className="input-base"
                  required
                  defaultValue=""
                >
                  <option value="" disabled>
                    Pilih rapat
                  </option>
                  {board.meetings.map((meeting) => (
                    <option key={meeting.id} value={meeting.id}>
                      {meeting.title} ·{" "}
                      {new Intl.DateTimeFormat("id-ID", {
                        dateStyle: "medium",
                      }).format(meeting.scheduledAt)}
                    </option>
                  ))}
                </select>
                {board.meetings.length === 0 ? (
                  <p className="mt-1 text-[11px] text-status-blocked-text">
                    Belum ada rapat tercatat. Buat rapat terlebih dahulu di modul
                    Rapat.
                  </p>
                ) : null}
              </div>
              <div>
                <label htmlFor="description" className="label-base">
                  Usulan perubahan
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  required
                  minLength={10}
                  className="input-base"
                  placeholder="Contoh: ganti warna aksen agar kontras teks memenuhi WCAG AA."
                />
              </div>
              <button type="submit" className="btn-primary" disabled={board.meetings.length === 0}>
                Ajukan permintaan
              </button>
            </form>
          </details>
        ) : null}
      </div>
    </section>
  );
}
