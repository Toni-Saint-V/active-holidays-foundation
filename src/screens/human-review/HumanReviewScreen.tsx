import { ScreenPlaceholder } from "@/screens/shared/ScreenPlaceholder";

export function HumanReviewScreen() {
  return (
    <ScreenPlaceholder
      eyebrow="Human Review"
      title="Эскалация на ручную проверку"
      description="Сценарий HUMAN_REVIEW уже выделен как отдельный экран. Дальше сюда попадут ambiguity, conflicts и expert handoff."
    />
  );
}
