import { Lock } from "lucide-react";

import { INDICATORS } from "@mediasync/shared";

import { INDICATOR_META } from "~/components/evaluations/constants";
import {
  submitPeerEvaluation,
  submitSelfEvaluation,
} from "~/server/actions/evaluations";
import type { EvaluationPeriodKey } from "~/server/queries/evaluations";

function LikertRow({
  indicator,
  label,
  helper,
  required = true,
}: {
  indicator: string;
  label: string;
  helper: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-cream-line py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">
          <span className="mr-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded bg-forest-50 px-1 font-mono text-[10px] font-semibold text-forest">
            {indicator}
          </span>
          {label}
        </p>
        <p className="mt-0.5 text-xs leading-5 text-ink-muted">{helper}</p>
      </div>
      <div
        role="radiogroup"
        aria-label={`${indicator} ${label}`}
        className="flex shrink-0 gap-1.5"
      >
        {[1, 2, 3, 4, 5].map((score) => (
          <label key={score} className="cursor-pointer">
            <input
              type="radio"
              name={`score-${indicator}`}
              value={score}
              required={required}
              className="peer sr-only"
            />
            <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-cream-line bg-cream-card text-sm font-semibold text-ink-muted transition-colors peer-checked:border-forest peer-checked:bg-forest peer-checked:text-cream-card peer-focus-visible:ring-2 peer-focus-visible:ring-forest peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-cream">
              {score}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function EvaluationForm({
  period,
  subjectId,
  subjectName,
  isSelf = false,
  submitted = false,
}: {
  period: EvaluationPeriodKey;
  subjectId?: string;
  subjectName: string;
  isSelf?: boolean;
  submitted?: boolean;
}) {
  if (submitted) {
    return (
      <div className="flex items-start gap-2 rounded-lg bg-sage/30 px-3 py-2.5 text-xs text-forest">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <p>
          {isSelf
            ? "Penilaian diri sudah tersimpan pada periode ini."
            : `Anda sudah menilai ${subjectName} pada periode ini.`}
        </p>
      </div>
    );
  }

  return (
    <form
      action={isSelf ? submitSelfEvaluation : submitPeerEvaluation}
      className="space-y-2"
    >
      <input type="hidden" name="period" value={period} />
      {!isSelf && subjectId ? (
        <input type="hidden" name="subjectId" value={subjectId} />
      ) : null}

      <div>
        {INDICATORS.map((indicator) => (
          <LikertRow
            key={indicator}
            indicator={indicator}
            label={INDICATOR_META[indicator].label}
            helper={INDICATOR_META[indicator].helper}
          />
        ))}
      </div>

      <div className="pt-2">
        <label htmlFor={`note-${subjectId ?? "self"}`} className="label-base">
          Catatan {isSelf ? "untuk diri sendiri" : "anonim"}{" "}
          <span className="font-normal text-ink-muted">(opsional)</span>
        </label>
        <textarea
          id={`note-${subjectId ?? "self"}`}
          name="note"
          rows={2}
          maxLength={500}
          className="input-base mt-1"
          placeholder={
            isSelf
              ? "Refleksi singkat tentang kontribusi dan hambatan Anda."
              : "Catatan dibaca anggota tanpa menampilkan nama penilai."
          }
        />
      </div>

      <button type="submit" className="btn-primary mt-2 w-full sm:w-auto">
        {isSelf ? "Simpan penilaian diri" : `Simpan penilaian ${subjectName}`}
      </button>
    </form>
  );
}
