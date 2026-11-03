import type { Indicator } from "@mediasync/shared";

export const INDICATOR_META: Record<
  Indicator,
  { label: string; helper: string; group: "active" | "discipline" }
> = {
  A1: {
    label: "Kehadiran & partisipasi",
    helper: "Hadir, terlibat, dan menyumbang dalam kerja tim.",
    group: "active",
  },
  A2: {
    label: "Inisiatif & ide kreatif",
    helper: "Mengusulkan ide dan mengambil langkah awal.",
    group: "active",
  },
  A3: {
    label: "Membantu & menjadi backup",
    helper: "Membantu rekan dan siap mengambil alih saat dibutuhkan.",
    group: "active",
  },
  D1: {
    label: "Ketepatan waktu internal",
    helper: "Menyelesaikan pekerjaan sebelum deadline internal.",
    group: "discipline",
  },
  D2: {
    label: "Kesesuaian spesifikasi & kualitas",
    helper: "Hasil kerja sesuai brief dan standar kualitas.",
    group: "discipline",
  },
  D3: {
    label: "Tanggung jawab & komunikasi hambatan",
    helper: "Mengomunikasikan hambatan lebih awal dan menuntaskan tanggung jawab.",
    group: "discipline",
  },
};

export const INTERVENTION_ORDER = [
  "NUDGE",
  "CHECK_IN",
  "REBALANCE",
  "FORMAL_WARNING",
  "BACKUP_AND_ESCALATE",
] as const;

export type InterventionStepKey = (typeof INTERVENTION_ORDER)[number];

export const INTERVENTION_CAUSE_HELP: Record<string, string> = {
  NO_ROLE_CLARITY:
    "Perjelas peran dan beri tugas spesifik. Jangan langsung memberi peringatan.",
  SKILL_MISMATCH:
    "Tukar tugas, dampingi, atau sesuaikan peran dengan keterampilan.",
  OVERLOAD:
    "Kurangi beban atau perjelas prioritas dan deadline.",
  PERSONAL_BARRIER:
    "Jadwalkan ulang atau siapkan backup tanpa menghukum.",
  LOW_EFFORT:
    "Gunakan jalur peringatan setelah cek kondisi dan penyesuaian beban.",
  UNKNOWN:
    "Tetap di langkah cek kondisi sampai penyebabnya jelas.",
};
