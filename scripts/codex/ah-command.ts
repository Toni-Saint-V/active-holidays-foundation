import { spawnSync } from "node:child_process";

type AhCommand = {
  id: string;
  title: string;
  description: string;
  commands: string[];
  promptRequired?: boolean;
};

const commands: AhCommand[] = [
  {
    id: "super",
    title: "Super operator",
    description: "Самый простой максимальный режим: skill mix, agent plan, proof gates.",
    promptRequired: true,
    commands: ["npm run skills:orchestrate -- --prompt \"super skill mix: $PROMPT\" --files \"$FILES\""]
  },
  {
    id: "auto",
    title: "Auto mode",
    description: "Автоматически определить режим, lane, agent pack и проверки по задаче.",
    promptRequired: true,
    commands: ["npm run skills:autopilot -- --prompt \"$PROMPT\""]
  },
  {
    id: "orchestrate",
    title: "Deep orchestration",
    description: "Включить глубокий план: полный skill scan, agent roles, prompt hardening и proof gates.",
    promptRequired: true,
    commands: ["npm run skills:orchestrate -- --prompt \"$PROMPT\" --files \"$FILES\""]
  },
  {
    id: "manual",
    title: "Manual mode",
    description: "Показать режим и шаги без исполнения flow.",
    promptRequired: true,
    commands: ["npm run skills:start -- --prompt \"$PROMPT\""]
  },
  {
    id: "custom",
    title: "Custom mode",
    description: "Кастомный routing packet по PROMPT и FILES.",
    promptRequired: true,
    commands: ["npm run skills:autopilot -- --prompt \"$PROMPT\" --files \"$FILES\""]
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
    ]
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
    ]
  },
  {
    id: "ui",
    title: "UI flow",
    description: "UI-задача: сначала PNG approval, потом реализация и visual QA.",
    commands: [
      "npm run skills:autopilot -- --prompt \"UI task: prepare PNG approval gate and implementation plan\"",
      "npm run typecheck"
    ]
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
    ]
  },
  {
    id: "skills",
    title: "Skills health",
    description: "Проверить компактный skill catalog, router и context checks.",
    commands: [
      "npm run skills:verify",
      "npm run automations:check:skills",
      "npm run automations:check:context"
    ]
  },
  {
    id: "next",
    title: "Autonomous next",
    description: "Показать следующий безопасный автономный шаг.",
    commands: ["npm run autonomous:next", "npm run autonomous:verify"]
  },
  {
    id: "audit",
    title: "Dependency audit",
    description: "Проверить supply-chain риск без force-fix.",
    commands: ["npm audit --omit=dev", "npm ls uuid @langchain/langgraph @langchain/langgraph-checkpoint @langchain/langgraph-sdk @langchain/langgraph-checkpoint-sqlite"]
  }
];

function printMenu() {
  console.log("Active Holidays commands:");
  for (const command of commands) {
    console.log(`- ${command.id.padEnd(12)} ${command.title} — ${command.description}`);
  }
  console.log("");
  console.log("Usage:");
  console.log("  npm run super -- \"найди самый сильный следующий шаг\"");
  console.log("  npm run ah:auto -- \"коротко опиши задачу\"");
  console.log("  npm run ah:orchestrate -- \"сложная задача\"");
  console.log("  npm run ah -- <command>");
  console.log("  FILES=\"src/file.ts\" npm run super -- \"задача с файлом\"");
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

const requested = process.argv[2];
const inlinePrompt = process.argv.slice(3).join(" ").trim();
const prompt = (process.env.PROMPT?.trim() || inlinePrompt).trim();
const files = (process.env.FILES ?? "").trim();

if (!requested || requested === "help" || requested === "menu") {
  printMenu();
  process.exit(0);
}

const selected = commands.find((command) => command.id === requested);

if (!selected) {
  console.error(`Unknown AH command: ${requested}`);
  printMenu();
  process.exit(1);
}

if (selected.promptRequired && !prompt) {
  console.error("Нужна задача обычным текстом после --");
  console.error("Пример: npm run super -- \"найди самый сильный следующий шаг\"");
  process.exit(1);
}

const childEnv = {
  ...process.env,
  PROMPT: prompt,
  FILES: files
};

console.log(`AH command: ${selected.title}`);
for (const command of selected.commands) {
  runShell(command, childEnv);
}
