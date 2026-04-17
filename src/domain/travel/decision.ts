import type {
  TravelDecisionInsight,
  TravelDecisionNextStep,
  TravelDecisionReasonCode,
  TravelDecisionResult,
  TravelDecisionSession,
  TravelDocumentItem,
  TravelDocumentsSection,
  TravelIntakeSubmission,
  TravelTrustCheck,
  TravelTrustSection
} from "@shared/contracts";

type DecisionContext = {
  isUrgent: boolean;
  hasDocumentBlocker: boolean;
  hasDocumentAttention: boolean;
  hasPlanningUncertainty: boolean;
  needsVisaSupport: boolean;
};

function buildDecisionContext(intake: TravelIntakeSubmission): DecisionContext {
  return {
    isUrgent: intake.departureWindow === "lt_30_days",
    hasDocumentBlocker: intake.passportStatus === "missing",
    hasDocumentAttention: intake.passportStatus === "needs_renewal",
    hasPlanningUncertainty: intake.destinationReadiness !== "chosen",
    needsVisaSupport: intake.needsVisaSupport
  };
}

function buildReasonCodes(
  intake: TravelIntakeSubmission,
  context: DecisionContext
): TravelDecisionReasonCode[] {
  const reasonCodes: TravelDecisionReasonCode[] = [];

  if (context.hasDocumentBlocker) {
    reasonCodes.push("passport_missing");
  } else if (context.hasDocumentAttention) {
    reasonCodes.push("passport_renewal");
  }

  if (context.hasPlanningUncertainty) {
    reasonCodes.push("destination_not_final");
  }

  if (context.needsVisaSupport) {
    reasonCodes.push("visa_support_required");
  }

  if (context.isUrgent && intake.destinationReadiness !== "chosen") {
    reasonCodes.push("urgent_timeline");
  }

  return reasonCodes;
}

function buildDocumentItems(intake: TravelIntakeSubmission): TravelDocumentItem[] {
  return [
    {
      id: "passport",
      label: "Паспорт",
      status:
        intake.passportStatus === "missing"
          ? "blocked"
          : intake.passportStatus === "needs_renewal"
            ? "attention_needed"
            : "ready",
      detail:
        intake.passportStatus === "missing"
          ? "Без действующего паспорта система не может считать маршрут подготовленным."
          : intake.passportStatus === "needs_renewal"
            ? "Нужно перепроверить срок действия паспорта под реальные даты поездки."
            : "Базовый документ для поездки отмечен как готовый."
    },
    {
      id: "route-brief",
      label: "Контур маршрута",
      status:
        intake.destinationReadiness === "chosen" ? "ready" : "attention_needed",
      detail:
        intake.destinationReadiness === "chosen"
          ? "Направление уже выбрано, можно готовить маршрутно-зависимые документы."
          : "Пока направление не зафиксировано, пакет документов стоит держать в базовом виде."
    },
    {
      id: "visa-track",
      label: "Визовый трек",
      status: intake.needsVisaSupport ? "attention_needed" : "ready",
      detail: intake.needsVisaSupport
        ? "Нужна отдельная проверка визовых требований и сроков подачи."
        : "Дополнительный визовый трек пока не требуется."
    }
  ];
}

function deriveDocumentReadiness(items: TravelDocumentItem[]): TravelDocumentsSection["readiness"] {
  if (items.some((item) => item.status === "blocked")) {
    return "blocked";
  }

  if (items.some((item) => item.status === "attention_needed")) {
    return "attention_needed";
  }

  return "ready";
}

function buildDocumentsSection(
  intake: TravelIntakeSubmission
): TravelDocumentsSection {
  const items = buildDocumentItems(intake);
  const readiness = deriveDocumentReadiness(items);

  return {
    readiness,
    summary:
      readiness === "blocked"
        ? "Есть документный блокер, который нужно снять до следующего шага."
        : readiness === "attention_needed"
          ? "Документная база частично готова, но требует уточнений перед углублением маршрута."
          : "Документная база выглядит достаточно устойчивой для следующего шага.",
    items
  };
}

function buildTrustChecks(intake: TravelIntakeSubmission): TravelTrustCheck[] {
  return [
    {
      id: "timeline",
      label: "Реалистичность сроков",
      status: intake.departureWindow === "lt_30_days" ? "review" : "clear",
      detail:
        intake.departureWindow === "lt_30_days"
          ? "Короткий горизонт требует ручной проверки сроков и последовательности действий."
          : "Горизонт поездки оставляет время на планирование и подготовку."
    },
    {
      id: "destination",
      label: "Определённость сценария",
      status:
        intake.destinationReadiness === "chosen"
          ? "clear"
          : intake.destinationReadiness === "comparing"
            ? "review"
            : "blocked",
      detail:
        intake.destinationReadiness === "chosen"
          ? "Направление зафиксировано, значит объяснение решения можно привязывать к одному сценарию."
          : intake.destinationReadiness === "comparing"
            ? "Есть несколько направлений, поэтому итог остаётся предварительным."
            : "Без выбранного направления система может дать только черновой ориентир."
    },
    {
      id: "document-consistency",
      label: "Согласованность документов",
      status:
        intake.passportStatus === "missing"
          ? "blocked"
          : intake.passportStatus === "needs_renewal"
            ? "review"
            : "clear",
      detail:
        intake.passportStatus === "missing"
          ? "Ключевой документ отсутствует, поэтому итоговое решение нельзя считать устойчивым."
          : intake.passportStatus === "needs_renewal"
            ? "Нужно перепроверить срок действия паспорта до углубления сценария."
            : "Базовые документы не конфликтуют с текущим сценарием."
    }
  ];
}

function deriveTrustReadiness(checks: TravelTrustCheck[]): TravelTrustSection["readiness"] {
  if (checks.some((check) => check.status === "blocked")) {
    return "blocked";
  }

  if (checks.some((check) => check.status === "review")) {
    return "attention_needed";
  }

  return "ready";
}

function buildExplanations(
  reasonCodes: TravelDecisionReasonCode[],
  documents: TravelDocumentsSection,
  trust: Pick<TravelTrustSection, "readiness">
): TravelDecisionInsight[] {
  const explanations: TravelDecisionInsight[] = [];

  if (reasonCodes.includes("passport_missing")) {
    explanations.push({
      id: "passport-missing",
      title: "Отсутствует базовый документ",
      detail:
        "Решение уходит в блокерный сценарий, потому что без паспорта остальные шаги теряют практический смысл.",
      severity: "blocker"
    });
  }

  if (reasonCodes.includes("passport_renewal")) {
    explanations.push({
      id: "passport-renewal",
      title: "Паспорт требует дополнительной проверки",
      detail:
        "Система считает маршрут предварительным, пока не подтверждён срок действия паспорта под даты поездки.",
      severity: "warning"
    });
  }

  if (reasonCodes.includes("destination_not_final")) {
    explanations.push({
      id: "destination-not-final",
      title: "Сценарий ещё не зафиксирован",
      detail:
        "Итог остаётся переходным, потому что финальное направление ещё не выбрано окончательно.",
      severity: trust.readiness === "blocked" ? "blocker" : "warning"
    });
  }

  if (reasonCodes.includes("visa_support_required")) {
    explanations.push({
      id: "visa-support",
      title: "Нужен отдельный визовый трек",
      detail:
        "Решение учитывает дополнительную ветку проверки, поэтому часть следующих шагов вынесена в документы и раздел доверия.",
      severity: "warning"
    });
  }

  if (reasonCodes.includes("urgent_timeline")) {
    explanations.push({
      id: "urgent-timeline",
      title: "Горизонт поездки короткий",
      detail:
        "Чем ближе поездка, тем выше цена ошибок во вводных и документах, поэтому требуется дополнительная проверка.",
      severity: "warning"
    });
  }

  if (explanations.length === 0) {
    explanations.push({
      id: "stable-scenario",
      title: "Базовый сценарий выглядит устойчивым",
      detail:
        documents.readiness === "ready"
          ? "На текущем уровне проверки нет заметных блокеров по документам и объяснимости."
          : "Есть рабочий базовый сценарий, но отдельные зоны ещё требуют внимания.",
      severity: "info"
    });
  }

  return explanations;
}

function buildTrustSection(
  intake: TravelIntakeSubmission,
  reasonCodes: TravelDecisionReasonCode[],
  documents: TravelDocumentsSection
): TravelTrustSection {
  const checks = buildTrustChecks(intake);
  const readiness = deriveTrustReadiness(checks);

  return {
    readiness,
    summary:
      readiness === "blocked"
        ? "У решения пока недостаточно устойчивых вводных, чтобы считать его надёжным."
        : readiness === "attention_needed"
          ? "Решение объяснимо, но требует дополнительной ручной проверки по части факторов."
          : "Ключевые сигналы выглядят согласованными и объяснимыми.",
    checks,
    explanations: buildExplanations(reasonCodes, documents, { readiness })
  };
}

function buildNextSteps(
  intake: TravelIntakeSubmission,
  documents: TravelDocumentsSection,
  trust: TravelTrustSection
): TravelDecisionNextStep[] {
  return [
    {
      id: "documents-step",
      label:
        documents.readiness === "blocked"
          ? "Сначала снять документный блокер"
          : documents.readiness === "attention_needed"
            ? "Проверить раздел документов перед следующим этапом"
            : "Документный трек можно считать базово готовым",
      status: documents.readiness === "ready" ? "done" : "pending",
      target: "documents"
    },
    {
      id: "trust-step",
      label:
        trust.readiness === "blocked"
          ? "Уточнить сценарий и повторно проверить объяснимость"
          : trust.readiness === "attention_needed"
            ? "Пройти проверку доверия по спорным факторам"
            : "Проверка доверия не выявила критичных зон",
      status: trust.readiness === "ready" ? "done" : "pending",
      target: "trust"
    },
    {
      id: "intake-step",
      label:
        intake.destinationReadiness === "chosen"
          ? "Анкету можно использовать как рабочую базу"
          : "После уточнения вводных пересчитать решение",
      status: intake.destinationReadiness === "chosen" ? "done" : "pending",
      target: intake.destinationReadiness === "chosen" ? "result" : "intake"
    }
  ];
}

export function buildTravelDecisionResult(
  intake: TravelIntakeSubmission
): TravelDecisionResult {
  const context = buildDecisionContext(intake);
  const reasonCodes = buildReasonCodes(intake, context);
  const documents = buildDocumentsSection(intake);
  const trust = buildTrustSection(intake, reasonCodes, documents);
  const nextSteps = buildNextSteps(intake, documents, trust);
  // Nested sections are the source of truth; top-level fields mirror them for summary consumers.
  const documentReadiness = documents.readiness;
  const trustReadiness = trust.readiness;

  if (documentReadiness === "blocked") {
    return {
      outcome: "needs_documents",
      documentReadiness,
      trustReadiness,
      summary:
        "Сначала нужно восстановить базовые документы. Без действующего паспорта переходить к планированию поездки рано.",
      nextStepLabel: "Подготовить документы",
      reasonCodes,
      nextSteps,
      documents,
      trust
    };
  }

  if (
    documentReadiness === "attention_needed" ||
    trustReadiness !== "ready" ||
    (context.isUrgent && context.needsVisaSupport)
  ) {
    return {
      outcome: "needs_review",
      documentReadiness,
      trustReadiness,
      summary:
        "Базовый маршрут можно собирать, но перед следующим этапом нужна ручная проверка по срокам и документам.",
      nextStepLabel: "Проверить риски вручную",
      reasonCodes,
      nextSteps,
      documents,
      trust
    };
  }

  return {
    outcome: "ready_to_plan",
    documentReadiness,
    trustReadiness,
    summary:
      "Базовая проверка пройдена: можно переходить к следующему этапу планирования поездки без дополнительных блокеров.",
    nextStepLabel: "Перейти к следующему этапу",
    reasonCodes,
    nextSteps,
    documents,
    trust
  };
}

export function buildTravelDecisionSession(
  intake: TravelIntakeSubmission,
  sessionMeta: {
    id: string;
    createdAt?: string;
  }
): TravelDecisionSession {
  return {
    id: sessionMeta.id,
    intake,
    result: buildTravelDecisionResult(intake),
    createdAt: sessionMeta.createdAt ?? new Date().toISOString()
  };
}
