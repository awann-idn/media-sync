import Link from "next/link";
import { Filter } from "lucide-react";

import { PHASE_META } from "@mediasync/shared";

import type { listProjectMembers } from "~/server/queries/tasks";

export function TaskFilters({
  view,
  phase,
  assignee,
  members,
}: {
  view: string;
  phase: string;
  assignee: string;
  members: Awaited<ReturnType<typeof listProjectMembers>>;
}) {
  const hasFilter = Boolean(phase || assignee);

  return (
    <form
      method="get"
      action="/tasks"
      className="mb-4 flex flex-col gap-2 rounded-card border border-cream-line bg-paper p-3 sm:flex-row sm:items-end"
    >
      <input type="hidden" name="view" value={view} />

      <div className="flex-1">
        <label htmlFor="phase" className="label-base">
          Fase
        </label>
        <select id="phase" name="phase" defaultValue={phase} className="input-base">
          <option value="">Semua fase</option>
          {Object.entries(PHASE_META).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1">
        <label htmlFor="assignee" className="label-base">
          Penanggung jawab
        </label>
        <select
          id="assignee"
          name="assignee"
          defaultValue={assignee}
          className="input-base"
        >
          <option value="">Semua anggota</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name} · {member.role.code}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <button type="submit" className="btn-primary min-h-11">
          <Filter className="h-4 w-4" aria-hidden />
          Terapkan
        </button>
        {hasFilter ? (
          <Link
            href={`/tasks?view=${view}`}
            className="btn-ghost min-h-11 border border-cream-line"
          >
            Reset
          </Link>
        ) : null}
      </div>
    </form>
  );
}
