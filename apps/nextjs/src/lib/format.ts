const DAY = 24 * 60 * 60 * 1000;

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: Date | string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return dateFormatter.format(date);
}

export function formatDateTime(value: Date | string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return dateTimeFormatter.format(date);
}

export function daysUntil(value: Date | string): number {
  const date = new Date(value);
  const diff = date.getTime() - Date.now();
  return Math.ceil(diff / DAY);
}

export function relativeDeadline(value: Date | string): string {
  const days = daysUntil(value);
  if (days < 0) return `Lewat ${Math.abs(days)} hari`;
  if (days === 0) return "Hari ini";
  if (days === 1) return "Besok";
  return `${days} hari lagi`;
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function scoreTone(score: number): "done" | "doing" | "blocked" {
  if (score >= 75) return "done";
  if (score >= 50) return "doing";
  return "blocked";
}
