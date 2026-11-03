import { Check } from "lucide-react";

import { cn } from "~/lib/utils";

const STEPS = [
  "Sepakati referensi",
  "Kumpulkan ide",
  "Beri skor",
  "Putuskan",
  "Dokumentasikan & bekukan",
  "QC konsistensi",
];

export function DecisionStepProgress({ currentStep }: { currentStep: number }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {STEPS.map((label, index) => {
        const step = index + 1;
        const done = step < currentStep;
        const active = step === currentStep;
        return (
          <li
            key={label}
            className={cn(
              "rounded-lg border px-3 py-2.5",
              active
                ? "border-forest bg-forest text-cream-card"
                : done
                  ? "border-sage-600 bg-sage/40 text-ink"
                  : "border-cream-line bg-paper text-ink-muted",
            )}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  active
                    ? "bg-cream-card text-forest"
                    : done
                      ? "bg-forest text-cream-card"
                      : "bg-cream-line text-ink-muted",
                )}
              >
                {done ? <Check className="h-3 w-3" aria-hidden /> : step}
              </span>
              <span className="text-[11px] font-semibold leading-4">{label}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
