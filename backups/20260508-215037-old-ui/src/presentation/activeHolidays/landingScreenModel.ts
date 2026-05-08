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

const m1LandingProductType: ProductType = "travel";
const productOrder: ProductType[] = [m1LandingProductType];

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
      summary: "AI: сначала собери выписку — это самый долгий шаг",
      reasons: [
        "Сначала фиксируем маршрут и слабые места, а не обещаем подачу заранее.",
        "Если кейс спорный, экран сразу переводит его в ручную проверку."
      ],
      action: "Следующий шаг: откроем первый сценарий и покажем результат."
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
      summary: "AI: сначала проверь доход — это главный фильтр по маршруту",
      reasons: [
        "Сервис держит маршрут, документы и эскалацию в одном экране.",
        "Закрытые направления не выглядят как готовое действие."
      ],
      action: "Следующий шаг: откроем рабочий путь и первый блок документов."
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
      summary: "AI: сначала проверь покрытие — это главный фильтр перед покупкой",
      reasons: [
        "Primary path не выглядит подтверждённым раньше времени.",
        "Слабые места показываются до целевого действия."
      ],
      action: "Следующий шаг: откроем результат и покажем пригодный сценарий."
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
  const resolvedProductType = productType === "travel" ? productType : m1LandingProductType;
  const copy = landingCopyByProduct[resolvedProductType];
  const route = routeByProduct[resolvedProductType];
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
