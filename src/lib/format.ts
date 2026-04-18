const ruFormatter = new Intl.NumberFormat("ru-RU");
const ruDate = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "short",
  timeStyle: "short"
});
const ruDateOnly = new Intl.DateTimeFormat("ru-RU", { dateStyle: "long" });

export function formatRub(value: number): string {
  if (value === 0) return "0 ₽";
  return `${ruFormatter.format(value)} ₽`;
}

export function formatWeeks(weeks: number): string {
  if (weeks === 0) return "сразу";
  if (weeks === 1) return "1 неделя";
  if (weeks > 1 && weeks < 5) return `${weeks} недели`;
  return `${weeks} недель`;
}

export function formatPercent(value: number, fractionDigits = 0): string {
  const clamped = Math.min(1, Math.max(0, value));
  return `${(clamped * 100).toFixed(fractionDigits)}%`;
}

export function formatDate(iso: string): string {
  try {
    return ruDate.format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatDateOnly(iso: string): string {
  try {
    return ruDateOnly.format(new Date(iso));
  } catch {
    return iso;
  }
}

export function pluralizeSignals(count: number): string {
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${count} сигналов`;
  if (mod10 === 1) return `${count} сигнал`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} сигнала`;
  return `${count} сигналов`;
}

export function pluralizeRules(count: number): string {
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${count} правил`;
  if (mod10 === 1) return `${count} правило`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} правила`;
  return `${count} правил`;
}
