import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
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
  it("keeps an unresolved boolean answer pending", async () => {
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

    expect(onAnswer).not.toHaveBeenCalled();
  });
});
