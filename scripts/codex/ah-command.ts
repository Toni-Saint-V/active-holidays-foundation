import { spawnSync } from "node:child_process";
import { autopilotMode, type AutopilotModeResult, type ModeId } from "./skill-mode-registry.ts";

type AhCommand = {
  id: string;
  title: string;
  description: string;
  commands?: string[];
  promptRequired?: boolean;
  simpleTask?: boolean;
  advanced?: boolean;
};

const commands: AhCommand[] = [
  {
    id: "do",
    title: "Сделать задачу",
    description: "Одна команда: сам выбирает режим, первые шаги и проверки.",
    promptRequired: true,
    simpleTask: true
  },
  {
    id: "check",
    title: "Проверить ветку",
    description: "Одна команда для полной локальной проверки.",
    commands: [
      "npm run verify:agent-stack",
      "npm run typecheck",
      "npm test",
      "npm run build",
      "npm audit --omit=dev"
    ]
  },
  {
    id: "super",
    title: "Super operator",
    description: "Самый простой максимальный режим: skill mix, agent plan, proof gates.",
    promptRequired: true,
    commands: ["npm run skills:orchestrate -- --prompt \"super skill mix: $PROMPT\" --files \"$FILES\""],
    advanced: true
  },
  {
    id: "auto",
    title: "Auto mode",
    description: "Автоматически определить режим, lane, agent pack и проверки по задаче.",
    promptRequired: true,
    commands: ["npm run skills:autopilot -- --prompt \"$PROMPT\""],
    advanced: true
  },
  {
    id: "orchestrate",
    title: "Deep orchestration",
    description: "Включить глубокий план: полный skill scan, agent roles, prompt hardening и proof gates.",
    promptRequired: true,
    commands: ["npm run skills:orchestrate -- --prompt \"$PROMPT\" --files \"$FILES\""],
    advanced: true
  },
  {
    id: "manual",
    title: "Manual mode",
    description: "Показать режим и шаги без исполнения flow.",
    promptRequired: true,
    commands: ["npm run skills:start -- --prompt \"$PROMPT\""],
    advanced: true
  },
  {
    id: "custom",
    title: "Custom mode",
    description: "Кастомный routing packet по PROMPT и FILES.",
    promptRequired: true,
    commands: ["npm run skills:autopilot -- --prompt \"$PROMPT\" --files \"$FILES\""],
    advanced: true
  },
  {
    id: "verify",
    title: "Full verify",
    description: "Полный локальный gate перед статусом done.",
    commands: [
      "npm run verify:agent-stack",
      "npm run typecheck",
      "npm test",
      "npm run build",
      "npm audit --omit=dev"
    ],
    advanced: true
  },
  {
    id: "review",
    title: "Review gate",
    description: "Ревью/merge gate: correctness + maintainability + release proof.",
    commands: [
      "npm run skills:autopilot -- --review-only",
      "npm run typecheck",
      "npm test",
      "npm run build"
    ],
    advanced: true
  },
  {
    id: "ui",
    title: "UI flow",
    description: "UI-задача: сначала PNG approval, потом реализация и visual QA.",
    commands: [
      "npm run skills:autopilot -- --prompt \"UI task: prepare PNG approval gate and implementation plan\"",
      "npm run typecheck"
    ],
    advanced: true
  },
  {
    id: "ship",
    title: "Ship gate",
    description: "Финальная проверка перед merge/release.",
    commands: [
      "npm run verify:agent-stack",
      "npm run typecheck",
      "npm test",
      "npm run build",
      "npm audit --omit=dev",
      "git status --short"
    ],
    advanced: true
  },
  {
    id: "skills",
    title: "Skills health",
    description: "Проверить компактный skill catalog, router и context checks.",
    commands: [
      "npm run skills:verify",
      "npm run automations:check:skills",
      "npm run automations:check:context"
    ],
    advanced: true
  },
  {
    id: "next",
    title: "Autonomous next",
    description: "Показать следующий безопасный автономный шаг.",
    commands: ["npm run autonomous:next", "npm run autonomous:verify"],
    advanced: true
  },
  {
    id: "audit",
    title: "Dependency audit",
    description: "Проверить supply-chain риск без force-fix.",
    commands: ["npm audit --omit=dev", "npm ls uuid @langchain/langgraph @langchain/langgraph-checkpoint @langchain/langgraph-sdk @langchain/langgraph-checkpoint-sqlite"],
    advanced: true
  }
];

const modeLabels: Record<ModeId, string> = {
  "ai-recommendation-boundary": "AI / рекомендации",
  "contract-boundary": "backend / контракты",
  "premium-ui": "UI, сначала PNG",
  "plugin-surface": "plugins / MCP",
  "regression-proof": "регрессии / тесты",
  "reliability-hardening": "надежность",
  "result-flow": "result flow",
  "review-gate": "ревью / merge",
  "skill-system-governance": "skills / рабочая система"
};

const modeSteps: Record<ModeId, string[]> = {
  "ai-recommendation-boundary": [
    "Отделить AI-текст от детерминированного решения.",
    "Проверить запасной сценарий, кеш и границу доверия.",
    "Добавить точечную проверку на слабый/пустой AI-ответ."
  ],
  "contract-boundary": [
    "Найти контракт и всех реальных потребителей.",
    "Изменить контракт и места использования одним узким проходом.",
    "Добавить минимальный тест на новый смысл данных."
  ],
  "premium-ui": [
    "Сначала сделать PNG-превью и получить аппрув.",
    "После аппрува менять UI-код минимальным изменением.",
    "Проверить мобилку, десктоп, состояния и русский текст."
  ],
  "plugin-surface": [
    "Проверить реальную plugin/MCP поверхность перед добавлением файлов.",
    "Не выдумывать формат manifest/config.",
    "Зафиксировать минимальный локальный контракт репо и проверить его."
  ],
  "regression-proof": [
    "Найти сценарий, который может сломаться повторно.",
    "Добавить самый узкий тест на регрессию.",
    "Проверить, что тест краснел бы без исправления."
  ],
  "reliability-hardening": [
    "Найти реальный сценарий сбоя.",
    "Сделать поведение закрытым при сбое без широкого переписывания.",
    "Проверить нормальный путь и запасной сценарий."
  ],
  "result-flow": [
    "Держать изменение внутри существующего экрана результата.",
    "Сохранить контракты доверия, документов и human-review.",
    "Проверить сценарий результата и крайнее состояние."
  ],
  "review-gate": [
    "Сначала искать блокеры и проблемы, а не писать пересказ.",
    "Проверить изменения, тесты и риск релиза.",
    "Дать решение запускать или блокировать с доказательствами."
  ],
  "skill-system-governance": [
    "Упростить существующий маршрутизатор и доки, не строить второй слой.",
    "Оставить один понятный вход для человека.",
    "Прогнать skill/router проверки."
  ]
};

function formatStatus(result: AutopilotModeResult): string {
  if (!result.mode) return "стоп: нужно уточнить задачу";
  if (result.blockedState.status !== "blocked") return "можно продолжать";
  if (result.mode === "premium-ui") return "стоп: сначала нужен PNG-аппрув";
  return "стоп: нужна ручная проверка перед исполнением";
}

function printMenu(advanced = false) {
  if (!advanced) {
    console.log("Запомни только это:");
    console.log("  npm run do -- \"задача\"     # я сам выбираю режим и проверки");
    console.log("  npm run check               # полная проверка ветки");
    console.log("");
    console.log("Еще проще:");
    console.log("  npm run ah -- \"задача\"     # то же самое, если забыл do");
    console.log("");
    console.log("Старые команды спрятаны:");
    console.log("  npm run ah -- advanced");
    return;
  }

  console.log("Advanced Active Holidays commands:");
  for (const command of commands.filter((command) => command.advanced)) {
    console.log(`- ${command.id.padEnd(12)} ${command.title} — ${command.description}`);
  }
  console.log("");
  console.log("Usage:");
  console.log("  npm run do -- \"найди самый сильный следующий шаг\"");
  console.log("  npm run ah:auto -- \"коротко опиши задачу\"");
  console.log("  npm run ah:orchestrate -- \"сложная задача\"");
  console.log("  npm run ah -- <command>");
  console.log("  FILES=\"src/file.ts\" npm run do -- \"задача с файлом\"");
}

function runShell(command: string, env: NodeJS.ProcessEnv) {
  const result = spawnSync(command, {
    shell: true,
    stdio: "inherit",
    env
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function printSimpleTask(prompt: string, files: string[]) {
  const result: AutopilotModeResult = autopilotMode({
    prompt,
    files,
    reviewOnly: false,
    deepOrchestration: true,
    deepOrchestrationSource: "flag",
    telemetryEnabled: false,
    telemetryFile: null
  });

  const mode = result.mode ? modeLabels[result.mode] : "нужен ручной выбор";
  const steps = result.mode ? modeSteps[result.mode] : ["Сначала уточнить один недостающий артефакт."];

  console.log("Принял задачу.");
  console.log(`Режим: ${mode}`);
  console.log(`Статус: ${formatStatus(result)}`);
  console.log("");
  console.log("Сначала:");
  for (const step of steps) {
    console.log(`- ${step}`);
  }
  console.log("");
  console.log("Проверить:");
  const verifyCommands = result.verifyCommands.length > 0 ? result.verifyCommands : ["npm run help"];
  for (const command of verifyCommands.slice(0, 4)) {
    console.log(`- ${command}`);
  }

  if (result.mode === "premium-ui") {
    console.log("");
    console.log("Важно: UI-код нельзя менять до PNG-аппрува.");
  }
}

let requested = process.argv[2];
let inlinePrompt = process.argv.slice(3).join(" ").trim();
let prompt = (process.env.PROMPT?.trim() || inlinePrompt).trim();
const files = (process.env.FILES ?? "").trim();

if (!requested || requested === "help" || requested === "menu") {
  printMenu();
  process.exit(0);
}

if (requested === "advanced") {
  printMenu(true);
  process.exit(0);
}

let selected = commands.find((command) => command.id === requested);

if (!selected) {
  selected = commands.find((command) => command.id === "do");
  inlinePrompt = process.argv.slice(2).join(" ").trim();
  prompt = (process.env.PROMPT?.trim() || inlinePrompt).trim();
}

if (!selected) {
  console.error("Не нашел команду do.");
  process.exit(1);
}

if (selected.promptRequired && !prompt) {
  console.error("Нужна задача обычным текстом после --");
  console.error("Пример: npm run do -- \"найди самый сильный следующий шаг\"");
  process.exit(1);
}

if (selected.simpleTask) {
  printSimpleTask(prompt, splitCsv(files));
  process.exit(0);
}

const childEnv = {
  ...process.env,
  PROMPT: prompt,
  FILES: files
};

console.log(`Запускаю: ${selected.title}`);
for (const command of selected.commands ?? []) {
  runShell(command, childEnv);
}
