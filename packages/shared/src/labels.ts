export const TASK_STATUS_META = {
  NOT_STARTED: { label: "Belum mulai", tone: "idle" as const },
  IN_PROGRESS: { label: "Sedang dikerjakan", tone: "doing" as const },
  UNDER_REVIEW: { label: "Menunggu review", tone: "review" as const },
  COMPLETED: { label: "Selesai", tone: "done" as const },
  BLOCKED: { label: "Terhambat", tone: "blocked" as const },
} as const;

export type TaskStatus = keyof typeof TASK_STATUS_META;

export const PHASE_META = {
  PRE_PRODUCTION: "Pra-produksi",
  PRODUCTION: "Produksi",
  POST_PRODUCTION: "Pasca-produksi",
} as const;

export type TaskPhase = keyof typeof PHASE_META;

export const ROLE_META = {
  PM: "Project Manager",
  CD: "Content Designer",
  GD: "Graphic Designer",
  AVE: "Audio/Video Editor",
  QC: "Quality Control",
} as const;

export type RoleCode = keyof typeof ROLE_META;

export const EVALUATION_CATEGORY_META = {
  EXCELLENT: { label: "Sangat baik", tone: "done" as const },
  MODERATE: { label: "Cukup", tone: "doing" as const },
  INTERVENTION_NEEDED: { label: "Perlu dukungan", tone: "blocked" as const },
} as const;

export const INTERVENTION_STEP_META = {
  NUDGE: "Pengingat",
  CHECK_IN: "Cek kondisi",
  REBALANCE: "Penyesuaian beban",
  FORMAL_WARNING: "Peringatan formal",
  BACKUP_AND_ESCALATE: "Backup & eskalasi",
} as const;

export type InterventionStep = keyof typeof INTERVENTION_STEP_META;

export const INTERVENTION_CAUSE_META = {
  NO_ROLE_CLARITY: "Peran belum jelas",
  SKILL_MISMATCH: "Ketidaksesuaian keterampilan",
  OVERLOAD: "Beban berlebih",
  PERSONAL_BARRIER: "Kendala pribadi",
  LOW_EFFORT: "Usaha rendah",
  UNKNOWN: "Belum diketahui",
} as const;

export const DECISION_STATUS_META = {
  PROPOSED: "Diusulkan",
  SHORTLISTED: "Dipertimbangkan",
  ACCEPTED: "Diterima",
  REJECTED: "Ditolak",
  FROZEN: "Dibekukan",
} as const;

export const CONFLICT_TYPE_META = {
  VISUAL_CONCEPT: "Konsep visual",
  LATE_ASSET: "Aset terlambat",
  REVISION_DISPUTE: "Sengketa revisi",
  RECURRING: "Berulang",
  WORKLOAD: "Beban kerja",
} as const;

export const CONFLICT_LEVEL_META = {
  1: "Level 1 · Diskusi langsung",
  2: "Level 2 · Perbandingan terstruktur",
  3: "Level 3 · Keputusan PM",
  4: "Level 4 · Eskalasi ke dosen",
} as const;

export const EVALUATION_PERIOD_META = {
  PRE: "Pra-produksi",
  PROD: "Produksi",
  POST: "Pasca-produksi",
  FINAL: "Evaluasi akhir",
} as const;

export type EvaluationPeriod = keyof typeof EVALUATION_PERIOD_META;
