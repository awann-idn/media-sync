import { Check, Circle, LifeBuoy, ShieldAlert } from "lucide-react";

import {
  INTERVENTION_CAUSE_META,
  INTERVENTION_STEP_META,
} from "@mediasync/shared";

import {
  INTERVENTION_CAUSE_HELP,
  INTERVENTION_ORDER,
  type InterventionStepKey,
} from "~/components/evaluations/constants";
import { recordIntervention } from "~/server/actions/evaluations";
import type {
  EvaluationMemberRow,
  EvaluationPeriodKey,
} from "~/server/queries/evaluations";

function nextStepFor(row: EvaluationMemberRow): InterventionStepKey | null {
  const latest = row.latestIntervention;
  if (!latest) return "NUDGE";
  const index = INTERVENTION_ORDER.indexOf(latest.step);
  return INTERVENTION_ORDER[index + 1] ?? null;
}

function StepLadder({ current }: { current: string | null }) {
  const currentIndex = current
    ? INTERVENTION_ORDER.indexOf(current as InterventionStepKey)
    : -1;

  return (
    <ol className="mt-3 grid gap-1.5 sm:grid-cols-5">
      {INTERVENTION_ORDER.map((step, index) => {
        const done = currentIndex >= index;
        const active = currentIndex === index;
        return (
          <li
            key={step}
            className={
              active
                ? "rounded-lg border border-forest bg-forest-50 px-2 py-1.5"
                : "rounded-lg border border-cream-line px-2 py-1.5"
            }
          >
            <div className="flex items-start gap-1">
              {done ? (
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-forest" aria-hidden />
              ) : (
                <Circle className="mt-0.5 h-3 w-3 shrink-0 text-ink-muted/40" aria-hidden />
              )}
              <span
                className={
                  done
                    ? "text-[10px] font-semibold leading-4 text-forest"
                    : "text-[10px] font-medium leading-4 text-ink-muted"
                }
              >
                {INTERVENTION_STEP_META[step]}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function InterventionPanel({
  rows,
  isPM,
  period,
}: {
  rows: EvaluationMemberRow[];
  isPM: boolean;
  period: EvaluationPeriodKey;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-card border border-cream-line bg-cream-card px-4 py-3">
        <LifeBuoy className="mt-0.5 h-4 w-4 shrink-0 text-forest" aria-hidden />
        <div>
          <h2 className="font-heading text-base font-bold text-ink">
            Tangga intervensi
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Diagnosa sebelum sanksi. Langkah tidak boleh dilompati: pengingat →
            cek kondisi (catat penyebab) → penyesuaian beban → peringatan formal
            → backup dan eskalasi.
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {rows.map((row) => {
          const latest = row.latestIntervention;
          const next = nextStepFor(row);
          const notesRequired =
            next === "REBALANCE" ||
            next === "FORMAL_WARNING" ||
            next === "BACKUP_AND_ESCALATE";

          return (
            <article key={row.member.id} className="card-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    {row.member.name}
                  </h3>
                  <p className="text-xs text-ink-muted">{row.member.roleName}</p>
                </div>
                {latest ? (
                  <span className="rounded-full bg-forest-50 px-2.5 py-1 text-[11px] font-semibold text-forest">
                    {latest.stepLabel}
                  </span>
                ) : (
                  <span className="rounded-full bg-cream px-2.5 py-1 text-[11px] font-medium text-ink-muted">
                    Belum ada intervensi
                  </span>
                )}
              </div>

              <StepLadder current={latest?.step ?? null} />

              {latest ? (
                <div className="mt-3 rounded-lg bg-cream/70 px-3 py-2 text-xs leading-5 text-ink-muted">
                  <p>
                    <span className="font-semibold text-ink">Terakhir:</span>{" "}
                    {latest.notes ?? "Tanpa catatan."}
                  </p>
                  <p className="mt-1">
                    Dicatat oleh {latest.recordedByName}. Penyebab:{" "}
                    {latest.causeCode
                      ? (INTERVENTION_CAUSE_META[
                          latest.causeCode as keyof typeof INTERVENTION_CAUSE_META
                        ] ?? latest.causeCode)
                      : "belum dicatat"}
                    .
                  </p>
                </div>
              ) : (
                <p className="mt-3 rounded-lg bg-cream/70 px-3 py-2 text-xs text-ink-muted">
                  Mulai dari pengingat suportif. Belum ada sanksi pada tahap ini.
                </p>
              )}

              {row.interventions.length > 1 ? (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-semibold text-forest">
                    Riwayat intervensi ({row.interventions.length})
                  </summary>
                  <ul className="mt-2 space-y-1.5">
                    {row.interventions.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-lg border border-cream-line px-3 py-2 text-xs text-ink-muted"
                      >
                        <span className="font-semibold text-ink">
                          {item.stepLabel}
                        </span>{" "}
                        · {item.notes ?? "Tanpa catatan"} · dicatat{" "}
                        {item.recordedByName}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}

              {isPM && next ? (
                <form action={recordIntervention} className="mt-4 space-y-3 border-t border-cream-line pt-4">
                  <input type="hidden" name="period" value={period} />
                  <input type="hidden" name="subjectId" value={row.member.id} />
                  <input type="hidden" name="step" value={next} />
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-forest">
                    <ShieldAlert className="h-4 w-4" aria-hidden />
                    Langkah berikutnya: {INTERVENTION_STEP_META[next]}
                  </p>

                  <div>
                    <label htmlFor={`cause-${row.member.id}`} className="label-base">
                      Penyebab{" "}
                      {next === "CHECK_IN" ? (
                        <span className="text-status-blocked-text">*wajib</span>
                      ) : (
                        <span className="font-normal text-ink-muted">(opsional)</span>
                      )}
                    </label>
                    <select
                      id={`cause-${row.member.id}`}
                      name="causeCode"
                      className="input-base"
                      required={next === "CHECK_IN"}
                      defaultValue=""
                    >
                      <option value="">Pilih penyebab…</option>
                      {Object.entries(INTERVENTION_CAUSE_META).map(
                        ([code, label]) => (
                          <option key={code} value={code}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div>
                    <label htmlFor={`notes-${row.member.id}`} className="label-base">
                      Catatan tindakan{" "}
                      {notesRequired ? (
                        <span className="text-status-blocked-text">*wajib</span>
                      ) : (
                        <span className="font-normal text-ink-muted">(opsional)</span>
                      )}
                    </label>
                    <textarea
                      id={`notes-${row.member.id}`}
                      name="notes"
                      rows={2}
                      required={notesRequired}
                      minLength={notesRequired ? 10 : undefined}
                      className="input-base"
                      placeholder={
                        next === "REBALANCE"
                          ? "Contoh: memindahkan aset prioritas ke Naya untuk satu siklus deadline."
                          : next === "FORMAL_WARNING"
                            ? "Tuliskan alasan peringatan setelah cek kondisi dan penyesuaian beban."
                            : next === "BACKUP_AND_ESCALATE"
                              ? "Tuliskan backup yang mengambil alih dan tindakan eskalasi."
                              : "Catatan singkat untuk anggota."
                      }
                    />
                  </div>

                  <details className="rounded-lg bg-forest-50 px-3 py-2">
                    <summary className="cursor-pointer text-[11px] font-semibold text-forest">
                      Panduan singkat berdasarkan penyebab
                    </summary>
                    <ul className="mt-1.5 space-y-1 text-[11px] leading-5 text-ink-muted">
                      {Object.entries(INTERVENTION_CAUSE_HELP).map(
                        ([code, help]) => (
                          <li key={code}>
                            <span className="font-semibold text-ink">
                              {INTERVENTION_CAUSE_META[
                                code as keyof typeof INTERVENTION_CAUSE_META
                              ]}
                              :
                            </span>{" "}
                            {help}
                          </li>
                        ),
                      )}
                    </ul>
                  </details>

                  <button type="submit" className="btn-secondary w-full">
                    Catat {INTERVENTION_STEP_META[next]}
                  </button>
                </form>
              ) : null}

              {!isPM && next ? (
                <p className="mt-3 text-xs text-ink-muted">
                  Observer hanya dapat membaca riwayat intervensi.
                </p>
              ) : null}

              {isPM && !next ? (
                <p className="mt-3 rounded-lg bg-status-blocked-soft px-3 py-2 text-xs text-status-blocked-text">
                  Tangga intervensi sudah di langkah terakhir. Eskalasi ke dosen
                  perlu dicatat melalui modul konflik.
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
