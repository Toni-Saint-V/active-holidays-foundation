import type {
  CaseSignals,
  CriticalRisk,
  NextAction,
  Offer,
  ProductType,
  RuleResult,
  Verdict
} from "@shared/contracts";
import { isInsuranceOffer, isResidencyOffer, isTravelOffer } from "@shared/contracts";
import { filterRelevantRuleResults } from "../rules/relevance";
import { getSignalValue } from "../signals";

type ResolveActionInput = {
  productType: ProductType;
  verdict: Verdict;
  primary: Offer | null;
  criticalRisk: CriticalRisk;
  ruleResults: RuleResult[];
  signals: CaseSignals;
  pathId?: string | null;
};

function travelAction(input: ResolveActionInput): NextAction {
  const { verdict, primary, criticalRisk, ruleResults, pathId } = input;
  const firedRules = filterRelevantRuleResults(
    ruleResults.filter((result) => result.fired),
    pathId
  );
  const humanReviewTriggerIds = firedRules
    .filter((result) => result.output.type === "human_review_trigger")
    .map((result) => result.ruleId);
  const blockerIds = firedRules
    .filter((result) => result.output.type === "blocker")
    .map((result) => result.ruleId);
  const warningIds = firedRules
    .filter((result) => result.output.type === "warning")
    .map((result) => result.ruleId);
  const advisoryIds = firedRules
    .filter((result) => result.output.type === "advisory")
    .map((result) => result.ruleId);

  if (verdict === "HUMAN_REVIEW" || humanReviewTriggerIds.length > 0) {
    return {
      type: "send_for_review",
      priority: "human_review",
      label: "Передать менеджеру",
      detail:
        "Решение неоднозначное: мы отправим заявку менеджеру агентства, он подтвердит маршрут и риски.",
      targetScreen: "human-review",
      triggeredBy: humanReviewTriggerIds.length > 0 ? humanReviewTriggerIds : ["ambiguity"]
    };
  }

  if (verdict === "NOT_NOW" || blockerIds.length > 0) {
    const blocker = firedRules.find((result) => result.output.type === "blocker");
    if (blocker && blocker.category === "document") {
      return {
        type: "upload_missing_docs",
        priority: "blocking",
        label: "Подготовить документы",
        detail: blocker.explanation,
        targetScreen: "documents",
        triggeredBy: blockerIds
      };
    }
    return {
      type: "wait_for_window",
      priority: "blocking",
      label: "Дождаться окна подачи",
      detail:
        criticalRisk?.detail ??
        "Сейчас поездка заблокирована — ждём открытия окна подачи или снятия ограничения.",
      targetScreen: "notifications",
      triggeredBy: blockerIds.length > 0 ? blockerIds : ["verdict_not_now"]
    };
  }

  if (primary && isTravelOffer(primary) && primary.kind === "consular_visa") {
    return {
      type: "book_appointment",
      priority: "path",
      label: "Записаться в визовый центр",
      detail: `Подобран трек «${primary.title}». Забронируйте ближайший слот для подачи.`,
      targetScreen: "result",
      triggeredBy: ["primary_path"]
    };
  }

  if (primary) {
    return {
      type: "start_application",
      priority: "path",
      label: "Запустить оформление",
      detail: `Подобран трек «${primary.id}». Стартуйте подачу прямо сейчас.`,
      targetScreen: "result",
      triggeredBy: ["primary_path"]
    };
  }

  if (warningIds.length > 0 || advisoryIds.length > 0) {
    return {
      type: "switch_path",
      priority: "advisory",
      label: "Подобрать альтернативный маршрут",
      detail:
        "Основного маршрута сейчас нет, но мы можем предложить альтернативу с учётом ограничений.",
      targetScreen: "result",
      triggeredBy: warningIds.concat(advisoryIds)
    };
  }

  return {
    type: "start_application",
    priority: "fallback",
    label: "Начать заявку",
    detail: "Базовых блокеров нет — можно открыть заявку и уточнять детали по ходу.",
    targetScreen: "intake",
    triggeredBy: ["fallback"]
  };
}

function residencyAction(input: ResolveActionInput): NextAction {
  const { verdict, primary, ruleResults, signals, pathId } = input;
  const firedRules = filterRelevantRuleResults(
    ruleResults.filter((result) => result.fired),
    pathId
  );
  const humanReviewIds = firedRules
    .filter((result) => result.output.type === "human_review_trigger")
    .map((result) => result.ruleId);

  if (verdict === "HUMAN_REVIEW" || humanReviewIds.length > 0) {
    return {
      type: "send_for_review",
      priority: "human_review",
      label: "Передать миграционному юристу",
      detail:
        "Правила ВНЖ конфликтуют или есть риск отказа — команда агентства оформит персональный план.",
      targetScreen: "human-review",
      triggeredBy: humanReviewIds.length > 0 ? humanReviewIds : ["ambiguity"]
    };
  }

  if (primary && isResidencyOffer(primary) && primary.status === "closed") {
    return {
      type: "switch_path",
      priority: "blocking",
      label: "Переключиться на активную программу",
      detail: `«${primary.nameRu}» закрыта. Рекомендуем NLV или DNV как альтернативу.`,
      targetScreen: "residency-es",
      triggeredBy: [primary.id]
    };
  }

  const income = getSignalValue<number>(signals, "income_monthly_eur");
  if (primary && isResidencyOffer(primary)) {
    if (income === undefined || income === 0) {
      return {
        type: "collect_financial_docs",
        priority: "path",
        label: "Собрать финансовые документы",
        detail: `Для «${primary.nameRu}» нужны подтверждения дохода за 12 месяцев и выписки со счёта.`,
        targetScreen: "documents",
        triggeredBy: [primary.id]
      };
    }
    const readyCount = getSignalValue<number>(signals, "documents_ready_count") ?? 0;
    const requiredCount = Math.max(
      getSignalValue<number>(signals, "documents_required_count") ?? primary.eligibilityRequirements.length,
      primary.eligibilityRequirements.length
    );
    if (readyCount < requiredCount) {
      return {
        type: "collect_financial_docs",
        priority: "path",
        label: "Собрать финансовые документы",
        detail: `Готово ${readyCount} из ${requiredCount}. Следующий шаг — закрыть чеклист и апостилировать документы.`,
        targetScreen: "documents",
        triggeredBy: [primary.id]
      };
    }
    if (primary.eligibilityRequirements.some((req) => req.toLowerCase().includes("апостил"))) {
      return {
        type: "apostille_documents",
        priority: "path",
        label: "Апостилировать документы",
        detail: `Для «${primary.nameRu}» нужна апостилированная справка и перевод с заверением.`,
        targetScreen: "documents",
        triggeredBy: [primary.id]
      };
    }
    return {
      type: "schedule_consulate_appointment",
      priority: "path",
      label: "Записаться в консульство",
      detail: `Запишитесь в ${primary.consulateOptions.join(" / ")} — слоты бронируются заранее.`,
      targetScreen: "residency-es",
      triggeredBy: [primary.id]
    };
  }

  if (verdict === "NOT_NOW") {
    return {
      type: "switch_path",
      priority: "blocking",
      label: "Сменить стратегию",
      detail: "Сейчас доступные программы закрыты или недотянуты — вернёмся, когда сигналы поменяются.",
      targetScreen: "residency-es",
      triggeredBy: ["verdict_not_now"]
    };
  }

  return {
    type: "collect_financial_docs",
    priority: "fallback",
    label: "Собрать финансовые документы",
    detail: "Начните с подтверждения дохода — остальное подключим к очередной анкете.",
    targetScreen: "residency-es",
    triggeredBy: ["fallback"]
  };
}

function insuranceAction(input: ResolveActionInput): NextAction {
  const { verdict, primary, ruleResults, signals, pathId } = input;
  const firedRules = filterRelevantRuleResults(
    ruleResults.filter((result) => result.fired),
    pathId
  );
  const hasChronic = getSignalValue<boolean>(signals, "has_chronic_conditions") ?? false;
  const humanReviewIds = firedRules
    .filter((result) => result.output.type === "human_review_trigger")
    .map((result) => result.ruleId);

  if (verdict === "HUMAN_REVIEW" || humanReviewIds.length > 0) {
    return {
      type: "send_for_review",
      priority: "human_review",
      label: "Передать менеджеру по страхованию",
      detail: "Кейс требует индивидуального подбора — менеджер подтвердит покрытие и цену.",
      targetScreen: "human-review",
      triggeredBy: humanReviewIds.length > 0 ? humanReviewIds : ["ambiguity"]
    };
  }

  if (!primary) {
    return {
      type: "switch_path",
      priority: "blocking",
      label: "Подобрать другой полис",
      detail: "Все полисы исключены фильтрами — ослабьте требования или обратитесь к менеджеру.",
      targetScreen: "insurance-adult",
      triggeredBy: ["no_primary"]
    };
  }

  if (hasChronic && isInsuranceOffer(primary) && primary.includes.chronic) {
    return {
      type: "request_medical_questionnaire",
      priority: "path",
      label: "Заполнить медицинскую анкету",
      detail: `${primary.providerNameRu} требует короткую анкету по хроническим заболеваниям до покупки.`,
      targetScreen: "insurance-adult",
      triggeredBy: [primary.id]
    };
  }

  if (
    isInsuranceOffer(primary) &&
    (getSignalValue<number>(signals, "coverage_amount_needed_eur") ?? 0) > primary.coverageAmountEur
  ) {
    return {
      type: "upgrade_coverage",
      priority: "advisory",
      label: "Увеличить покрытие",
      detail: `Запрошенное покрытие выше, чем у ${primary.providerNameRu}. Рассмотрите полис с большей суммой.`,
      targetScreen: "insurance-adult",
      triggeredBy: [primary.id]
    };
  }

  return {
    type: "buy_policy",
    priority: "path",
    label: "Купить полис",
    detail: `Оформите полис «${(primary as Extract<Offer, { productType: "insurance_adult" }>).productNameRu ?? primary.id}» за несколько минут онлайн.`,
    targetScreen: "insurance-adult",
    triggeredBy: [primary.id]
  };
}

export function resolveAction(input: ResolveActionInput): NextAction {
  switch (input.productType) {
    case "travel":
      return travelAction(input);
    case "residency_es":
      return residencyAction(input);
    case "insurance_adult":
      return insuranceAction(input);
  }
}
