import { spawnSync } from "node:child_process";

type AhCommand = {
  id: string;
  title: string;
  description: string;
  commands: string[];
};

const commands: AhCommand[] = [
  {
    id: "auto",
    title: "Auto mode",
    description: "Автоматически определить режим, lane, agent pack и проверки по PROMPT.",
    commands: ["npm run skills:autopilot -- --prompt \"$PROMPT\""]
  },
  {
    id: "manual",
    title: "Manual mode",
    description: "Показать режим и шаги без исполнения flow.",
    commands: ["npm run skills:start -- --prompt \"$PROMPT\""]
  },
  {
    id: "custom",
    title: "Custom mode",
    description: "Кастомный routing packet по PROMPT и FILES.",
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
    console.log(`- ${command.id.padEnd(8)} ${command.title} — ${command.description}`);
  }
  console.log("");
  console.log("Usage:");
  console.log("  npm run ah -- <command>");
  console.log("  PROMPT=\"...\" npm run ah:auto");
  console.log("  PROMPT=\"...\" FILES=\"src/file.ts\" npm run ah:custom");
}

function runShell(command: string) {
  const result = spawnSync(command, {
    shell: true,
    stdio: "inherit",
    env: process.env
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const requested = process.argv[2];

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

console.log(`AH command: ${selected.title}`);
for (const command of selected.commands) {
  runShell(command);
}
