import type {
  TravelDecisionReasonCode,
  TravelDecisionResult,
  TravelDecisionSession,
  TravelIntakeSubmission
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

export function buildTravelDecisionResult(
  intake: TravelIntakeSubmission
): TravelDecisionResult {
  const context = buildDecisionContext(intake);
  const reasonCodes = buildReasonCodes(intake, context);

  if (context.hasDocumentBlocker) {
    return {
      outcome: "needs_documents",
      documentReadiness: "blocked",
      summary:
        "Сначала нужно восстановить базовые документы. Без действующего паспорта переходить к планированию поездки рано.",
      nextStepLabel: "Подготовить документы",
      reasonCodes,
      checklist: [
        { id: "passport", label: "Оформить или восстановить паспорт", done: false },
        {
          id: "timeline",
          label: "После этого вернуться к анкете и подтвердить сроки поездки",
          done: false
        }
      ]
    };
  }

  if (context.hasDocumentAttention || (context.isUrgent && context.needsVisaSupport)) {
    return {
      outcome: "needs_review",
      documentReadiness: "attention_needed",
      summary:
        "Базовый маршрут можно собирать, но перед следующим этапом нужна ручная проверка по срокам и документам.",
      nextStepLabel: "Проверить риски вручную",
      reasonCodes,
      checklist: [
        {
          id: "passport-check",
          label: "Проверить срок действия паспорта под даты поездки",
          done: intake.passportStatus === "valid"
        },
        {
          id: "visa-path",
          label: "Уточнить визовые требования и сроки подачи",
          done: !intake.needsVisaSupport
        }
      ]
    };
  }

  if (context.hasPlanningUncertainty) {
    return {
      outcome: "needs_review",
      documentReadiness: "ready",
      summary:
        "Документная база выглядит нормально, но итоговый маршрут рано фиксировать, пока направление не выбрано окончательно.",
      nextStepLabel: "Сузить сценарий поездки",
      reasonCodes,
      checklist: [
        {
          id: "destination",
          label: "Выбрать приоритетное направление для следующего расчёта",
          done: false
        },
        {
          id: "rerun",
          label: "После выбора повторно отправить анкету",
          done: false
        }
      ]
    };
  }

  return {
    outcome: "ready_to_plan",
    documentReadiness: "ready",
    summary:
      "Базовая проверка пройдена: можно переходить к следующему этапу планирования поездки без дополнительных блокеров.",
    nextStepLabel: "Перейти к следующему этапу",
    reasonCodes,
    checklist: [
      {
        id: "confirm-dates",
        label: "Подтвердить даты поездки и состав путешественников",
        done: true
      },
      {
        id: "collect-docs",
        label: "Подготовить документы под выбранный маршрут",
        done: true
      }
    ]
  };
}

export function buildTravelDecisionSession(
  intake: TravelIntakeSubmission
): TravelDecisionSession {
  return {
    intake,
    result: buildTravelDecisionResult(intake),
    createdAt: new Date().toISOString()
  };
}
