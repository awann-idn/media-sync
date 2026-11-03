import Link from "next/link";

import { PHASE_META } from "@mediasync/shared";

import { createTask } from "~/server/actions/tasks";
import type { listProjectMembers } from "~/server/queries/tasks";

const DAY = 24 * 60 * 60 * 1000;

function toInputDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function TaskForm({
  members,
  nextStep,
  defaultPhase = "PRE_PRODUCTION",
}: {
  members: Awaited<ReturnType<typeof listProjectMembers>>;
  nextStep: number;
  defaultPhase?: keyof typeof PHASE_META;
}) {
  const now = Date.now();
  const defaultInternal = toInputDate(new Date(now + 7 * DAY));
  const defaultOfficial = toInputDate(new Date(now + 10 * DAY));

  return (
    <section className="card-surface mb-5 p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-lg font-bold text-ink">Tugas baru</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Deadline internal harus lebih awal dari deadline resmi.
          </p>
        </div>
        <Link href="/tasks" className="btn-ghost min-h-9 px-3 py-1.5 text-xs">
          Batal
        </Link>
      </div>

      <form action={createTask} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="title" className="label-base">
            Judul tugas
          </label>
          <input
            id="title"
            name="title"
            required
            maxLength={120}
            className="input-base"
            placeholder="Contoh: Menyusun storyboard final"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="description" className="label-base">
            Deskripsi <span className="font-normal normal-case">(opsional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="input-base"
            placeholder="Konteks singkat dan ekspektasi hasil"
          />
        </div>

        <div>
          <label htmlFor="phase" className="label-base">
            Fase
          </label>
          <select
            id="phase"
            name="phase"
            defaultValue={defaultPhase}
            className="input-base"
          >
            {Object.entries(PHASE_META).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="stepNo" className="label-base">
            Nomor langkah
          </label>
          <input
            id="stepNo"
            name="stepNo"
            type="number"
            min={1}
            defaultValue={nextStep}
            required
            className="input-base tabular"
          />
        </div>

        <div>
          <label htmlFor="assignedUserId" className="label-base">
            Penanggung jawab
          </label>
          <select
            id="assignedUserId"
            name="assignedUserId"
            required
            className="input-base"
            defaultValue=""
          >
            <option value="" disabled>
              Pilih anggota
            </option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} · {member.role.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="backupUserId" className="label-base">
            PIC cadangan <span className="font-normal normal-case">(opsional)</span>
          </label>
          <select
            id="backupUserId"
            name="backupUserId"
            defaultValue=""
            className="input-base"
          >
            <option value="">Tidak ada</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} · {member.role.code}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="internalDeadline" className="label-base">
            Deadline internal
          </label>
          <input
            id="internalDeadline"
            name="internalDeadline"
            type="date"
            required
            defaultValue={defaultInternal}
            className="input-base"
          />
        </div>

        <div>
          <label htmlFor="officialDeadline" className="label-base">
            Deadline resmi
          </label>
          <input
            id="officialDeadline"
            name="officialDeadline"
            type="date"
            required
            defaultValue={defaultOfficial}
            className="input-base"
          />
        </div>

        <div className="flex items-end gap-2 sm:col-span-2">
          <button type="submit" className="btn-primary">
            Simpan tugas
          </button>
          <p className="text-xs text-ink-muted">
            Tugas baru masuk ke kolom Belum mulai.
          </p>
        </div>
      </form>
    </section>
  );
}
