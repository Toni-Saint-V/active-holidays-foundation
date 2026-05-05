import {
  type Case,
  type HumanReviewCasePacket,
  type HumanReviewRequest,
  type ResultPayload
} from "@shared/contracts";

function ruleReviewReason(result: ResultPayload): string | null {
  return result.ruleResults.find(
    (rule) => rule.fired && rule.output.type === "human_review_trigger"
  )?.explanation ?? null;
}

function reviewReason(result: ResultPayload, request: HumanReviewRequest): string {
  return (
    request.handoff?.humanReviewReason ??
    result.trust.humanReviewReason ??
    result.trust.blockingReason ??
    ruleReviewReason(result) ??
    result.nextAction.detail
  );
}

function evidenceNote(result: ResultPayload): string | null {
  switch (result.trust.evidenceStatus) {
    case "stale":
      return "Источники устарели: оператор должен проверить актуальность перед любым выводом.";
    case "missing":
      return "Критичные источники отсутствуют: автоматическое решение нельзя считать доказанным.";
    case "conflicting":
      return "Источники конфликтуют: нужен ручной разбор до любого следующего действия.";
    case "manual_only":
      return "Источник допускает только ручную интерпретацию, автомат не должен закрывать кейс.";
    case "valid":
      return null;
  }
}

function resultDrift(result: ResultPayload, request: HumanReviewRequest): HumanReviewCasePacket["resultDrift"] {
  const confidenceDelta = Number((result.trust.confidence - request.snapshot.confidence).toFixed(4));
  const verdictChanged = result.verdict !== request.snapshot.verdict;
  const computedAtChanged = result.computedAt !== request.snapshot.computedAt;
  const lastCheckedAtChanged = result.trust.lastCheckedAt !== request.snapshot.lastCheckedAt;
  const nextActionChanged = result.nextAction.label !== request.snapshot.nextActionLabel;

  return {
    changed:
      verdictChanged ||
      confidenceDelta !== 0 ||
      computedAtChanged ||
      lastCheckedAtChanged ||
      nextActionChanged,
    verdictChanged,
    confidenceDelta,
    computedAtChanged,
    lastCheckedAtChanged,
    nextActionChanged
  };
}

export function buildHumanReviewCasePacket({
  caseData,
  request,
  result,
  now = new Date()
}: {
  caseData: Case;
  request: HumanReviewRequest;
  result: ResultPayload;
  now?: Date;
}): HumanReviewCasePacket {
  const reason = reviewReason(result, request);
  const documentsToInspect = result.documents.items.filter((item) => item.status !== "ready");
  const scenario = request.handoff
    ? {
        id: request.handoff.scenarioId,
        title: request.handoff.scenarioTitle,
        safetyStatus: request.handoff.safetyStatus,
        evidenceStatus: request.handoff.evidenceStatus,
        freshnessStatus: request.handoff.freshnessStatus,
	        blockingReason: request.handoff.blockingReason,
	        humanReviewReason: request.handoff.humanReviewReason,
	        operatorNextAction: request.handoff.operatorNextAction,
	        nextActionLabel: request.handoff.userNextActionLabel
	      }
    : null;
  const checklist: HumanReviewCasePacket["operatorChecklist"] = [
    {
      id: "review-reason",
      title: "Проверить причину ручной проверки",
      detail: reason,
      priority: "critical",
      source: "request"
    }
  ];

  if (result.trust.evidenceStatus !== "valid" || result.trust.freshnessStatus !== "fresh") {
    checklist.push({
      id: "evidence-gate",
      title: "Проверить доказательную базу",
      detail:
        result.trust.blockingReason ??
        result.trust.humanReviewReason ??
        "Evidence gate не разрешает автоматическое решение по текущему кейсу.",
      priority: "critical",
      source: "evidence"
    });
  }

  for (const document of documentsToInspect.slice(0, 4)) {
    checklist.push({
      id: `document:${document.id}`,
      title: `Проверить документ: ${document.label}`,
      detail: document.detail,
      priority: document.status === "blocked" ? "high" : "medium",
      source: "documents"
    });
  }

  if (result.criticalRisk) {
    checklist.push({
      id: `risk:${result.criticalRisk.id}`,
      title: result.criticalRisk.label,
      detail: result.criticalRisk.detail,
      priority: "critical",
      source: "risk"
    });
  }

	  if (scenario) {
	    checklist.push({
	      id: `scenario:${scenario.id}`,
	      title: `Разобрать сценарий: ${scenario.title}`,
	      detail: scenario.operatorNextAction,
	      priority: scenario.safetyStatus === "evidence_blocked" ? "critical" : "high",
	      source: "scenario"
	    });
  }

  const notes = [
    evidenceNote(result),
    scenario?.safetyStatus === "evidence_blocked"
      ? "Сценарий заблокирован evidence gate и не является советом к автоматическому действию."
      : null,
    scenario?.safetyStatus === "human_review_only"
      ? "Сценарий видим как причина ручной проверки, а не как автоматическая рекомендация."
      : null,
    "Не обещать пользователю результат до решения оператора."
  ].filter((note): note is string => Boolean(note));

  return {
    version: "human-review-packet.v1",
    generatedAt: now.toISOString(),
    case: {
      id: caseData.id,
      title: caseData.title,
      productType: caseData.productType,
      updatedAt: caseData.updatedAt
    },
	    request,
	    submittedSnapshot: request.snapshot,
	    currentResult: {
	      verdict: result.verdict,
	      confidence: result.trust.confidence,
	      computedAt: result.computedAt,
	      nextAction: result.nextAction
	    },
	    resultDrift: resultDrift(result, request),
	    reviewReason: reason,
    evidence: {
      evidenceStatus: result.trust.evidenceStatus,
      freshnessStatus: result.trust.freshnessStatus,
      blockingReason: result.trust.blockingReason,
      humanReviewReason: result.trust.humanReviewReason,
      lastCheckedAt: result.trust.lastCheckedAt
    },
    scenario,
    operatorChecklist: checklist,
    documentsToInspect,
    riskSummary: {
      criticalRisk: result.criticalRisk,
      risks: result.risks
    },
    doNotAutoDecideNotes: notes
  };
}
