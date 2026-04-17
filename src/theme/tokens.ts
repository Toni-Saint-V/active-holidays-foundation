import type { Verdict } from "@shared/contracts";

export const verdictTone: Record<
  Verdict,
  {
    label: string;
    surface: string;
    text: string;
    ring: string;
    badge: string;
    accent: string;
  }
> = {
  GO: {
    label: "Можно ехать",
    surface: "bg-emerald-500/10",
    text: "text-emerald-300",
    ring: "ring-emerald-400/40",
    badge: "bg-emerald-500 text-black",
    accent: "#34d399"
  },
  GO_WITH_CONDITIONS: {
    label: "Можно, но с условиями",
    surface: "bg-amber-500/10",
    text: "text-amber-200",
    ring: "ring-amber-400/40",
    badge: "bg-amber-400 text-black",
    accent: "#fbbf24"
  },
  NOT_NOW: {
    label: "Пока не сейчас",
    surface: "bg-rose-500/10",
    text: "text-rose-200",
    ring: "ring-rose-400/40",
    badge: "bg-rose-500 text-white",
    accent: "#f97066"
  },
  HUMAN_REVIEW: {
    label: "Нужна проверка менеджером",
    surface: "bg-sky-500/10",
    text: "text-sky-200",
    ring: "ring-sky-400/40",
    badge: "bg-sky-500 text-white",
    accent: "#38bdf8"
  }
};

export const severityTone = {
  critical: { label: "Критично", text: "text-rose-200", surface: "bg-rose-500/15", dot: "bg-rose-400" },
  high: { label: "Высокий риск", text: "text-rose-100", surface: "bg-rose-500/10", dot: "bg-rose-300" },
  medium: { label: "Средний риск", text: "text-amber-100", surface: "bg-amber-500/10", dot: "bg-amber-300" },
  low: { label: "Низкий риск", text: "text-emerald-100", surface: "bg-emerald-500/10", dot: "bg-emerald-300" }
} as const;

export const sourceTierTone = {
  official: { label: "Официальный", surface: "bg-sky-500/10", text: "text-sky-200" },
  operator: { label: "Оператор", surface: "bg-violet-500/10", text: "text-violet-200" },
  crowdsourced: { label: "Краудсорс", surface: "bg-zinc-500/10", text: "text-zinc-200" }
} as const;
