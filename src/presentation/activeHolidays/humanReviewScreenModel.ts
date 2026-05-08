import type {
  AuditTrail,
  DecisionLogEntry,
  HumanReviewChannel,
  HumanReviewCasePacket,
  HumanReviewRequest,
  ResultPayload,
  RuleResult
} from "@shared/contracts";
import { formatDate } from "@/lib/format";
import {
  HUMAN_REVIEW_PIPELINE_ORDER,
  HUMAN_REVIEW_STATUS_LABELS,
  HUMAN_REVIEW_VERDICT_LABELS,
  pulseAmplitudeForSeverity
} from "./screenModelUtils";

type AuditSnapshot = {
  trail: AuditTrail;
  decisions: DecisionLogEntry[];
};

type OverviewTone = "default" | "notice";
type PipelineState = "completed" | "current" | "pending";
type HumanReviewScreenMode = "loading" | "open_review" | "required_review" | "optional_review";

export type HumanReviewScreenModel = {
  mode: HumanReviewScreenMode;
  header: {
    eyebrow: string;
    heading: string;
    description: string;
    badgeLabel: string;
    badgeTone: "review" | "neutral";
  };
  loadingState:
    | {
        title: string;
        description: string;
      }
    | null;
  overview: {
    rows: Array<{
      id: string;
      text: string;
      tone: OverviewTone;
    }>;
  };
  openReview:
    | {
        pipelineEyebrow: string;
        pipeline: Array<{
          id: HumanReviewRequest["status"];
          label: string;
          state: PipelineState;
        }>;
        snapshotTitle: string;
        channelLabel: string;
        contactLabel: string;
        verdictLabel: string;
        nextActionLabel: string;
        message: string;
        openCaseLabel: string;
      }
    | null;
  submitForm:
    | {
        messageLabel: string;
        messagePlaceholder: string;
        messageHint: string;
        channelLabel: string;
        channels: Array<{
          value: HumanReviewChannel;
          label: string;
        }>;
        contactPlaceholders: Record<HumanReviewChannel, string>;
        primaryActionLabel: string;
        secondaryActionLabel: string;
        availabilityNote: string;
      }
    | null;
  triggersSection:
    | {
        heading: string;
        items: Array<{
          id: string;
          title: string;
          detail: string;
        }>;
      }
    | null;
  warningsSection:
    | {
        heading: string;
        items: Array<{
          id: string;
          severity: "critical" | "high" | "medium" | "low";
          label: string;
          detail: string;
          triggeredBy: string[];
          pulseAmplitude: number;
        }>;
      }
    | null;
  auditSection:
    | {
        heading: string;
        historyLabel: string;
        steps: AuditTrail["steps"];
        history: Array<{
          id: string;
          label: string;
        }>;
      }
    | null;
  packetSection:
    | {
        heading: string;
        reviewReason: string;
        evidenceLabel: string;
        scenarioLabel: string | null;
        checklist: HumanReviewCasePacket["operatorChecklist"];
        documentsToInspect: HumanReviewCasePacket["documentsToInspect"];
        doNotAutoDecideNotes: string[];
      }
    | null;
};

function openRequest(request: HumanReviewRequest | null): HumanReviewRequest | null {
  if (!request) return null;
  if (request.status === "resolved" || request.status === "cancelled") return null;
  return request;
}

function headerDescription(result: ResultPayload, hasOpenReview: boolean): string {
  if (hasOpenReview) {
    return "Запрос уже в работе: показываем реальный статус и следующий шаг без лишних обещаний.";
  }

  if (result.verdict === "HUMAN_REVIEW") {
    return "Есть неоднозначности по рискам или данным — кейс должен закрыть эксперт.";
  }

  return "Ручная проверка не обязательна, но можно передать кейс эксперту для дополнительной верификации.";
}

function toUserFacingRuleText(explanation: string): string {
  const normalized = explanation.replace(/\s+/g, " ").trim();
  if (!normalized) return "Нужно уточнение по кейсу у менеджера.";
  if (/automation=|evidence|manual_only|R\d{2}|rule|repo=|scope=/i.test(normalized)) {
    return "Нужно вручную проверить источники и ограничения кейса перед следующим шагом.";
  }
  if (/[A-Za-z]{4,}/.test(normalized)) {
    return "Есть техническое ограничение данных — решение передаётся эксперту.";
  }
  return normalized.length > 170 ? `${normalized.slice(0, 167)}…` : normalized;
}

function humanReviewTriggers(ruleResults: RuleResult[]) {
  const unique = new Set<string>();
  return ruleResults
    .filter((rule) => rule.fired && rule.output.type === "human_review_trigger")
    .map((rule) => ({
      id: rule.ruleId,
      title: "Причина проверки",
      detail: toUserFacingRuleText(rule.explanation)
    }))
    .filter((item) => {
      const key = item.detail.toLowerCase();
      if (unique.has(key)) return false;
      unique.add(key);
      return true;
    });
}

function warningRows(ruleResults: RuleResult[]) {
  return ruleResults
    .filter((rule) => rule.fired && rule.output.type === "warning")
    .map((rule) => ({
      id: rule.ruleId,
      severity: rule.output.severity ?? "medium",
      label: toUserFacingRuleText(rule.explanation).split(".")[0],
      detail: toUserFacingRuleText(rule.explanation),
      triggeredBy: [rule.ruleId],
      pulseAmplitude: pulseAmplitudeForSeverity(rule.output.severity)
    }));
}

const EVIDENCE_STATUS_LABELS: Record<HumanReviewCasePacket["evidence"]["evidenceStatus"], string> = {
  valid: "проверены",
  stale: "устарели",
  missing: "не хватает",
  conflicting: "конфликтуют",
  manual_only: "только ручная проверка"
};

const FRESHNESS_STATUS_LABELS: Record<HumanReviewCasePacket["evidence"]["freshnessStatus"], string> = {
  fresh: "актуальные",
  stale: "устарели",
  unknown: "неизвестна"
};

const SCENARIO_SAFETY_LABELS: Record<NonNullable<HumanReviewCasePacket["scenario"]>["safetyStatus"], string> = {
  safe_automatic: "можно обработать автоматически",
  degraded_usable: "можно использовать с ограничениями",
  evidence_blocked: "заблокирован доказательной базой",
  human_review_only: "только ручная проверка"
};

export function buildHumanReviewScreenModel({
  result,
  caseUpdatedAt,
  request,
  packet,
  audit,
  humanReviewStatus
}: {
  result: ResultPayload;
  caseUpdatedAt: string;
  request: HumanReviewRequest | null;
  packet?: HumanReviewCasePacket | null;
  audit: AuditSnapshot | null;
  humanReviewStatus: "idle" | "loading" | "ready" | "error";
}): HumanReviewScreenModel {
  const activeRequest = openRequest(request);
  const hasOpenReview = activeRequest !== null;
  const isLoadingCurrentState =
    activeRequest === null && humanReviewStatus !== "ready" && humanReviewStatus !== "error";
  const mode: HumanReviewScreenMode = isLoadingCurrentState
    ? "loading"
    : hasOpenReview
      ? "open_review"
      : result.verdict === "HUMAN_REVIEW"
        ? "required_review"
        : "optional_review";
  const triggerItems = humanReviewTriggers(result.ruleResults);
  const warningItems = warningRows(result.ruleResults);
  const currentPipelineIndex = hasOpenReview
    ? HUMAN_REVIEW_PIPELINE_ORDER.indexOf(activeRequest.status)
    : -1;

  return {
    mode,
    header: {
      eyebrow: "Ручная проверка",
      heading:
        mode === "loading"
          ? "Проверяем активный запрос"
          : hasOpenReview
            ? "Запрос уже в работе"
            : "Передаём кейс менеджеру",
      description:
        mode === "loading"
          ? "Сначала честно проверим, есть ли уже активный запрос по этому кейсу. Только потом покажем форму или текущий статус."
          : headerDescription(result, hasOpenReview),
      badgeLabel:
        mode === "loading"
          ? "проверяем"
          : hasOpenReview
            ? HUMAN_REVIEW_STATUS_LABELS[activeRequest.status]
            : mode === "required_review"
              ? "нужна ручная проверка"
              : "по запросу",
      badgeTone: mode === "optional_review" ? "neutral" : "review"
    },
    loadingState:
      mode === "loading"
        ? {
            title: "Проверяем, есть ли активный запрос",
            description:
              "Если запрос уже отправлен, покажем его текущий статус. Если нет — откроем форму передачи кейса."
          }
        : null,
    overview: {
      rows: [
        {
          id: "updated-at",
          text: `Последнее обновление: ${formatDate(caseUpdatedAt)}`,
          tone: "default"
        },
        {
          id: "next-action",
          text: `Следующее действие: ${result.nextAction.label}`,
          tone: "default"
        },
        ...(request
          ? [
              {
                id: "durability",
                text:
                  request.durability === "persisted"
                    ? "Статус ручной проверки хранится на сервере и вернётся после обновления страницы или повторного открытия кейса."
                    : "Статус запроса временный: если сессия сбросится, попросим отправить кейс повторно.",
                tone: "notice" as const
              }
            ]
          : [])
      ]
    },
    openReview: hasOpenReview
      ? {
          pipelineEyebrow: "статус запроса",
          pipeline: HUMAN_REVIEW_PIPELINE_ORDER.map((step, index) => ({
            id: step,
            label: HUMAN_REVIEW_STATUS_LABELS[step],
            state:
              activeRequest.status === step
                ? "current"
                : currentPipelineIndex >= index
                  ? "completed"
                  : "pending"
          })),
          snapshotTitle: "Что зафиксировали в запросе",
          channelLabel: activeRequest.channel === "email" ? "Почта" : "Телеграм",
          contactLabel: activeRequest.contact,
          verdictLabel: HUMAN_REVIEW_VERDICT_LABELS[activeRequest.snapshot.verdict],
          nextActionLabel: activeRequest.snapshot.nextActionLabel,
          message: activeRequest.message,
          openCaseLabel: "Открыть кейс"
        }
      : null,
    submitForm: hasOpenReview
      ? null
      : mode === "loading"
      ? null
      : {
          messageLabel: "Опишите случай",
          messagePlaceholder:
            "Например: был отказ в 2024, лечу в Италию 12 мая, хочу понять, можно ли подаваться сейчас.",
          messageHint:
            "Эксперт увидит исходный текст без переписывания. Чем конкретнее контекст, тем меньше уточнений потом.",
          channelLabel: "Как ответить",
          channels: [
            { value: "email", label: "Почта" },
            { value: "telegram", label: "Телеграм" }
          ],
          contactPlaceholders: {
            email: "you@example.com",
            telegram: "@username"
          },
          primaryActionLabel: "Передать менеджеру",
          secondaryActionLabel: "Открыть кейс",
          availabilityNote:
            "Обычно отвечаем в течение рабочего дня. Если сессия прервётся, попросим отправить кейс повторно, чтобы не показывать недостоверный статус."
        },
    triggersSection:
      triggerItems.length > 0
        ? {
            heading: "Что именно требует ручной проверки",
            items: triggerItems
          }
        : null,
    warningsSection:
      warningItems.length > 0
        ? {
            heading: "Активные предупреждения",
            items: warningItems
          }
        : null,
    auditSection:
      audit && result.verdict !== "HUMAN_REVIEW"
        ? {
            heading: "Аудит решения",
            historyLabel: "История пересчётов",
            steps: audit.trail.steps,
            history: audit.decisions.slice(0, 5).map((entry) => ({
              id: entry.id,
              label: `${formatDate(entry.recordedAt)} · ${entry.summary}`
            }))
          }
        : null,
    packetSection: packet
      ? {
          heading: "Пакет для оператора",
          reviewReason: packet.reviewReason,
          evidenceLabel: `Источники: ${
            EVIDENCE_STATUS_LABELS[packet.evidence.evidenceStatus]
          }, актуальность: ${FRESHNESS_STATUS_LABELS[packet.evidence.freshnessStatus]}`,
          scenarioLabel: packet.scenario
            ? `${packet.scenario.title} · ${SCENARIO_SAFETY_LABELS[packet.scenario.safetyStatus]}`
            : null,
          checklist: packet.operatorChecklist,
          documentsToInspect: packet.documentsToInspect,
          doNotAutoDecideNotes: packet.doNotAutoDecideNotes
        }
      : null
  };
}
