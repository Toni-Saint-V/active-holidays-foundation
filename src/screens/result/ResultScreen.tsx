import { ScreenPlaceholder } from "@/screens/shared/ScreenPlaceholder";

export function ResultScreen() {
  return (
    <ScreenPlaceholder
      eyebrow="Result"
      title="Вердикт и маршрут"
      description="Result route уже зарегистрирован. После доменной фазы сюда подключится deterministic payload, confidence и explainability."
    />
  );
}
