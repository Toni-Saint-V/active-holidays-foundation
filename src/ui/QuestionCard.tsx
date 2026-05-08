import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import type { IntakeQuestion } from "@shared/contracts";
import { Button, Card } from "./primitives";
import { Chip } from "./primitives";
import { SegmentedControl } from "./SegmentedControl";
import { formatPercent } from "@/lib/format";

type Answer = string | number | boolean | null;

type Props = {
  question: IntakeQuestion;
  onAnswer: (value: Answer) => void;
  children?: ReactNode;
};

function weeksUntil(isoDate: string): number | null {
  if (!isoDate) return null;
  const target = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = target.getTime() - start.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (!Number.isFinite(days) || days < 0) return null;
  return Math.max(0, Math.ceil(days / 7));
}

export function QuestionCard({ question, onAnswer, children }: Props) {
  const [draft, setDraft] = useState<string>("");
  const [booleanDraft, setBooleanDraft] = useState<"yes" | "no" | "none">("none");
  const [tripDateDraft, setTripDateDraft] = useState<string>("");
  const tripWeeks = weeksUntil(tripDateDraft);

  useEffect(() => {
    setDraft("");
    setBooleanDraft("none");
    setTripDateDraft("");
  }, [question.id]);

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="grid gap-4">
        <header className="grid gap-1">
          <p className="text-[11px] uppercase tracking-wide text-textMuted">
            {question.mandatory ? "Обязательный сигнал" : "Уточняющий сигнал"} ·
            информативность {formatPercent(question.informationGain, 0)}
          </p>
          <h2 className="text-xl font-semibold text-textPrimary">{question.prompt}</h2>
          {question.helper && (
            <p className="text-sm text-textSecondary">{question.helper}</p>
          )}
        </header>

        {question.kind === "enum" && question.options && (
          <div className="grid gap-2">
            {question.options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onAnswer(option.value)}
                className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-left text-sm text-textPrimary transition hover:border-accent/60 hover:bg-accent/10"
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {question.kind === "boolean" && (
          <SegmentedControl
            value={booleanDraft}
            onChange={(value) => {
              setBooleanDraft(value);
              if (value === "none") {
                onAnswer(null);
                return;
              }
              onAnswer(value === "yes");
            }}
            options={[
              { value: "yes", label: "Да" },
              { value: "no", label: "Нет" },
              { value: "none", label: "Не знаю" }
            ]}
          />
        )}

        {question.kind === "number" && (
          <div className="grid gap-3">
            {question.id === "timeline_weeks" ? (
              <div className="grid gap-2 rounded-xl border border-border bg-surface-2 px-3 py-3">
                <label
                  htmlFor="timeline-weeks-date"
                  className="text-xs uppercase tracking-[0.2em] text-textMuted"
                >
                  Дата вылета
                </label>
                <input
                  id="timeline-weeks-date"
                  type="date"
                  value={tripDateDraft}
                  onChange={(event) => setTripDateDraft(event.target.value)}
                  className="rounded-xl border border-borderStrong bg-surface px-3 py-2 text-sm text-textPrimary outline-none transition focus:border-accent/60"
                />
                <p className="text-xs text-textSecondary">
                  {tripWeeks === null
                    ? "Выберите дату — пересчитаем горизонт поездки в недели."
                    : `До поездки: ${tripWeeks} нед.`}
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (tripWeeks === null) return;
                    onAnswer(tripWeeks);
                  }}
                  disabled={tripWeeks === null}
                >
                  Применить дату
                </Button>
              </div>
            ) : null}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                const parsed = Number(draft);
                if (!Number.isFinite(parsed)) return;
                onAnswer(parsed);
                setDraft("");
              }}
              className="grid gap-3"
            >
              <input
                type="number"
                value={draft}
                min={question.min}
                max={question.max}
                onChange={(event) => setDraft(event.target.value)}
                className="rounded-xl border border-borderStrong bg-surface-2 px-4 py-3 text-sm text-textPrimary"
                placeholder="Введите число"
              />
              <div className="flex flex-wrap gap-2">
                {[1, 4, 8, 12].map((value) => (
                  <Chip key={value} onClick={() => onAnswer(value)}>
                    {value}
                  </Chip>
                ))}
                <Button size="sm" type="submit" variant="secondary">
                  Подтвердить
                </Button>
              </div>
            </form>
          </div>
        )}

        <p className="text-xs text-textMuted">
          Сигнал разблокирует правила: {question.unlocksRules.join(", ") || "—"}.
        </p>

        {children}
      </Card>
    </motion.div>
  );
}
