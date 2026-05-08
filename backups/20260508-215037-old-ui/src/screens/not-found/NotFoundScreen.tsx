import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/ui/primitives";
import { EmptyState } from "@/ui/EmptyState";
import { Compass } from "lucide-react";
import { useScreenView } from "@/instrumentation/screenView";

export function NotFoundScreen() {
  useScreenView("not-found");
  const location = useLocation();
  const navigate = useNavigate();
  const target = location.pathname;
  return (
    <EmptyState
      icon={<Compass className="h-5 w-5" />}
      title="Такого маршрута в приложении нет"
      description={`Адрес «${target}» не входит в карту экранов M1. Вернитесь к сценариям или откройте последнюю анкету — данные никуда не делись.`}
      action={
        <div className="flex gap-2">
          <Button onClick={() => navigate("/")}>К сценариям</Button>
          <Button variant="secondary" onClick={() => navigate("/intake")}>
            К анкете
          </Button>
        </div>
      }
    />
  );
}
