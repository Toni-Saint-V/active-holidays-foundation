import type { ProductType } from "@shared/contracts";
import { productLabelsRu } from "@shared/contracts";

export type LandingBenefitTone = "result" | "need" | "ai";

export type LandingScreenModel = {
  eyebrow: string;
  headline: [string, string, string];
  subline: string;
  productPills: Array<{
    productType: ProductType;
    label: string;
  }>;
  bridge: {
    leftChip: string;
    rightChip: string;
    nodes: Array<{
      id: string;
      label: string;
      tone: "info" | "need" | "result";
    }>;
    defaultNodeId: string;
    nodeSummary: Record<string, string>;
  };
  benefits: Array<{
    id: string;
    title: string;
    text: string;
    tone: LandingBenefitTone;
  }>;
  ai: {
    summary: string;
    reasons: string[];
    action: string;
  };
  cta: {
    label: string;
    subcopy: string;
    startPath: string;
    examplePath: string;
  };
};

type LandingCopy = Omit<
  LandingScreenModel,
  "productPills" | "bridge" | "cta"
> & {
  ctaSubcopy: string;
  leftChip: string;
  rightChip: string;
};

const routeByProduct: Record<ProductType, string> = {
  travel: "/result",
  residency_es: "/residency-es",
  insurance_adult: "/insurance-adult"
};

const productOrder: ProductType[] = ["travel", "residency_es", "insurance_adult"];

const bridgeNodes: LandingScreenModel["bridge"]["nodes"] = [
  { id: "check", label: "Проверка", tone: "info" },
  { id: "documents", label: "Документы", tone: "need" },
  { id: "submit", label: "Подача", tone: "result" }
];

const bridgeNodeSummary = {
  check: "Сначала сверяем кейс и не обещаем лишнего.",
  documents: "Потом собираем ровно тот пакет, который влияет на маршрут.",
  submit: "Только после этого ведём к следующему действию."
};

const landingCopyByProduct: Record<ProductType, LandingCopy> = {
  travel: {
    eyebrow: "умный помощник по визам",
    headline: ["Пойми маршрут.", "Собери пакет.", "Подайся спокойно."],
    subline:
      "Active Holidays помогает понять, можно ли подавать, что собрать и какой следующий шаг действительно правильный.",
    leftChip: "Паспорт",
    rightChip: "Италия 🇮🇹",
    benefits: [
      {
        id: "result",
        title: "Ясный результат",
        text: "Сразу видишь, можно ли идти дальше",
        tone: "result"
      },
      {
        id: "plan",
        title: "Пакет действий",
        text: "Сразу понимаешь, что нужно собрать",
        tone: "need"
      },
      {
        id: "ai",
        title: "AI-подсказки",
        text: "Получаешь живые рекомендации по шагам",
        tone: "ai"
      }
    ],
    ai: {
      summary: "AI: сначала закрой запись и финансы — это два главных узких места до подачи",
      reasons: [
        "В туристических кейсах срок сгорает не на анкете, а на поиске слота и проверке выписок для пакета документов.",
        "Сначала показываем ограничения и риски по фактам, а не создаём ложное ощущение готовности к подаче."
      ],
      action: "Проверь результат, закрой первый блокер по документам и только потом переходи к подаче."
    },
    ctaSubcopy: "Откроем первый сценарий и покажем результат."
  },
  residency_es: {
    eyebrow: "умный помощник по ВНЖ",
    headline: ["Определи путь.", "Собери досье.", "Подавайся спокойно."],
    subline:
      "Active Holidays раскладывает путь к ВНЖ на допустимый маршрут, нужные документы и момент, когда уже нужен человек.",
    leftChip: "Досье",
    rightChip: "Испания 🇪🇸",
    benefits: [
      {
        id: "path",
        title: "Допустимый путь",
        text: "Сразу видно, какой маршрут реально рабочий",
        tone: "result"
      },
      {
        id: "steps",
        title: "Список шагов",
        text: "Документы и сроки собраны в один план",
        tone: "need"
      },
      {
        id: "ai",
        title: "AI-подсказки",
        text: "Подсказываем, с какого шага начинать",
        tone: "ai"
      }
    ],
    ai: {
      summary: "AI: сначала зафиксируй легальность дохода и маршрут подачи — это ключ к рабочему пути ВНЖ",
      reasons: [
        "Для ВНЖ слабое подтверждение дохода ломает маршрут даже при полном досье документов.",
        "Проверь риски по занятости и происхождению дохода: так отсекаются пути, которые не проходят проверку."
      ],
      action: "Проверь маршрут, собери первый обязательный блок документов и зафиксируй ключевой риск до подачи."
    },
    ctaSubcopy: "Откроем рабочий путь и первый блок документов."
  },
  insurance_adult: {
    eyebrow: "умный помощник по страховке",
    headline: ["Проверь допуск.", "Собери условия.", "Покупай спокойно."],
    subline:
      "Active Holidays помогает выбрать полис по реальной пригодности к кейсу, а не по витрине или красивому обещанию.",
    leftChip: "Полис",
    rightChip: "Шенген 🇪🇺",
    benefits: [
      {
        id: "eligibility",
        title: "Ясный допуск",
        text: "Сразу видно, подходит ли полис под кейс",
        tone: "result"
      },
      {
        id: "terms",
        title: "Чёткие условия",
        text: "Понимаешь, что нужно добрать до покупки",
        tone: "need"
      },
      {
        id: "ai",
        title: "AI-подсказки",
        text: "Получаешь краткий разбор по шагам",
        tone: "ai"
      }
    ],
    ai: {
      summary: "AI: сначала проверь покрытие и допуск полиса под маршрут, потом цену — не наоборот",
      reasons: [
        "Полис с низкой ценой бесполезен, если не закрывает риск кейса и обязательные требования маршрута.",
        "Проверь пригодность и документы до оплаты: так покупка не ломает маршрут на следующем шаге."
      ],
      action: "Проверь допуск полиса, закрой критичный риск покрытия и только потом сравни цену."
    },
    ctaSubcopy: "Откроем результат и покажем пригодный сценарий."
  }
};

export function buildLandingScreenModel({
  productType,
  selectedScenarioCaseId
}: {
  productType: ProductType;
  selectedScenarioCaseId?: string | null;
}): LandingScreenModel {
  const copy = landingCopyByProduct[productType];
  const route = routeByProduct[productType];
  const query = selectedScenarioCaseId
    ? `?case=${encodeURIComponent(selectedScenarioCaseId)}`
    : "";

  return {
    eyebrow: copy.eyebrow,
    headline: copy.headline,
    subline: copy.subline,
    productPills: productOrder.map((item) => ({
      productType: item,
      label: productLabelsRu[item]
    })),
    bridge: {
      leftChip: copy.leftChip,
      rightChip: copy.rightChip,
      nodes: bridgeNodes,
      defaultNodeId: "check",
      nodeSummary: bridgeNodeSummary
    },
    benefits: copy.benefits,
    ai: copy.ai,
    cta: {
      label: "Начать маршрут",
      subcopy: copy.ctaSubcopy,
      startPath: selectedScenarioCaseId
        ? `/intake?case=${encodeURIComponent(selectedScenarioCaseId)}`
        : "/intake",
      examplePath: `${route}${query}`
    }
  };
}
