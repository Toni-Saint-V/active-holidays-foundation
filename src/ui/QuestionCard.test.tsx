import type { ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { QuestionCard } from "./QuestionCard";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: ComponentProps<"div">) => <div {...props}>{children}</div>,
    span: ({
      children,
      layoutId: _layoutId,
      ...props
    }: ComponentProps<"span"> & { layoutId?: string }) => <span {...props}>{children}</span>
  }
}));

describe("QuestionCard", () => {
  it("persists an explicit unresolved boolean answer as null", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();

    render(
      <QuestionCard
        question={{
          id: "insurance_ok",
          label: "Страховка",
          kind: "boolean",
          mandatory: true,
          productTypes: ["travel"],
          prompt: "Есть страховка?",
          informationGain: 0.7,
          unlocksRules: ["r09_insurance_gap"],
          answered: false
        }}
        onAnswer={onAnswer}
      />
    );

    await user.click(screen.getByRole("tab", { name: "Не знаю" }));

    expect(onAnswer).toHaveBeenCalledWith(null);
  });

  it("submits false when user selects 'Нет' for a boolean question", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();

    render(
      <QuestionCard
        question={{
          id: "previous_schengen_visa",
          label: "Был ли шенген",
          kind: "boolean",
          mandatory: false,
          productTypes: ["travel"],
          prompt: "Получали шенген за 3 года?",
          informationGain: 0.4,
          unlocksRules: ["r03_prior_travel_history"],
          answered: false
        }}
        onAnswer={onAnswer}
      />
    );

    await user.click(screen.getByRole("tab", { name: "Нет" }));

    expect(onAnswer).toHaveBeenCalledWith(false);
  });

  it("converts selected trip date into timeline weeks", async () => {
    const user = userEvent.setup();
    const onAnswer = vi.fn();

    render(
      <QuestionCard
        question={{
          id: "timeline_weeks",
          label: "Горизонт поездки",
          kind: "number",
          mandatory: true,
          productTypes: ["travel"],
          prompt: "Через сколько недель выезд?",
          min: 0,
          max: 104,
          informationGain: 0.9,
          unlocksRules: ["r04_slot_timing_gap"],
          answered: false
        }}
        onAnswer={onAnswer}
      />
    );

    const dateInput = screen.getByLabelText("Дата вылета");
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 42);
    const iso = target.toISOString().slice(0, 10);
    fireEvent.change(dateInput, { target: { value: iso } });
    await user.click(screen.getByRole("button", { name: "Применить дату" }));

    expect(onAnswer).toHaveBeenCalledWith(6);
  });
});
