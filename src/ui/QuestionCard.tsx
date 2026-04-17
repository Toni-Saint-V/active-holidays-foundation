import { useState, type ReactNode } from "react";
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

export function QuestionCard({ question, onAnswer, children }: Props) {
  const [draft, setDraft] = useState<string>("");

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
            value="none"
            onChange={(value) => {
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
        )}

        <p className="text-xs text-textMuted">
          Сигнал разблокирует правила: {question.unlocksRules.join(", ") || "—"}.
        </p>

        {children}
      </Card>
    </motion.div>
  );
}
