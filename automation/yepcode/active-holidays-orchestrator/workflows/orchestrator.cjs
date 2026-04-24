const fs = require("node:fs");
const path = require("node:path");

const TASK_TYPES = [
  "feature",
  "bug",
  "ux",
  "design",
  "tech_debt",
  "research",
  "growth",
  "seo",
  "monetization",
  "ops"
];

const PRIORITIES = ["P0", "P1", "P2", "P3"];
const STATUSES = [
  "Inbox",
  "Needs Clarification",
  "Ready",
  "In Progress",
  "In Review",
  "Done",
  "Blocked"
];

const ENGINEERING_TYPES = new Set(["feature", "bug", "ux", "design", "tech_debt"]);
const VISUAL_TYPES = new Set(["ux", "design"]);
const TECHNICAL_TASK_TYPES = new Set(["feature", "bug", "tech_debt"]);

const TYPE_LABELS = {
  feature: "feature",
  bug: "bug",
  ux: "ux",
  design: "design",
  tech_debt: "tech-debt",
  research: "research",
  growth: "growth",
  seo: "seo",
  monetization: "monetization",
  ops: "ops"
};

const PRODUCT_AREA_PATTERNS = [
  { area: "result_flow", pattern: /result|verdict|decision|compare|результ|вердикт|решени|сравнен/i },
  { area: "intake", pattern: /intake|questionnaire|анкета|опрос|форма/i },
  { area: "human_review", pattern: /human review|manual review|ручн|эксперт|оператор/i },
  { area: "documents", pattern: /document|docs|документ/i },
  { area: "trust", pattern: /trust|confidence|source|довер|источник|риск/i },
  { area: "automation", pattern: /automation|orchestrator|notion|github|codex|yepcode|автомат/i },
  { area: "lovable_bridge", pattern: /lovable|prototype|прототип/i },
  { area: "growth", pattern: /growth|seo|content|traffic|conversion|монетиза|рост|контент/i },
  { area: "platform", pattern: /api|server|state|store|contract|infra|runtime|schema|техдолг/i }
];

function compact(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function toArray(value) {
  if (Array.isArray(value)) return value.map(compact).filter(Boolean);
  if (typeof value === "string" && compact(value)) return [compact(value)];
  return [];
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object ?? {}, key);
}

function slugify(value) {
  return compact(value)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function firstSentence(rawInput) {
  const text = compact(rawInput);
  const sentence = text.split(/(?<=[.!?])\s+/u)[0] || text;
  return sentence.length > 220 ? `${sentence.slice(0, 217)}...` : sentence;
}

function titleCase(value) {
  const text = compact(value);
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function normalizeEnum(value, allowed, fallback) {
  const normalized = compact(value).toLowerCase().replace(/[-\s]+/g, "_");
  return allowed.includes(normalized) ? normalized : fallback;
}

function inferType(rawInput, hints = {}) {
  const hinted = normalizeEnum(hints.type, TASK_TYPES, "");
  if (hinted) return hinted;

  const text = compact(rawInput).toLowerCase();
  if (/bug|ошиб|слом|crash|не работает|regression|баг/.test(text)) return "bug";
  if (/feature|new capability|add|build|create|добав|созда|сделать/.test(text)) return "feature";
  if (/ux|flow|friction|confus|понятн|ясност|путь пользователя/.test(text)) return "ux";
  if (/design|visual|layout|screen|ui|lovable|макет|визуал|экран/.test(text)) return "design";
  if (/tech debt|refactor|debt|cleanup|архитект|рефактор|долг/.test(text)) return "tech_debt";
  if (/research|market|competitor|исслед|рынок|конкурент/.test(text)) return "research";
  if (/growth|conversion|activation|retention|рост|воронк|конвер/.test(text)) return "growth";
  if (/seo|content|article|keyword|контент|ключев/.test(text)) return "seo";
  if (/price|pricing|revenue|monetization|оплат|доход|монетиза/.test(text)) return "monetization";
  if (/ops|process|support|handoff|операц|процесс/.test(text)) return "ops";
  return "feature";
}

function inferPriority(rawInput, hints = {}) {
  const hinted = compact(hints.priority).toUpperCase();
  if (PRIORITIES.includes(hinted)) return hinted;

  const text = compact(rawInput).toLowerCase();
  if (/\bp0\b|critical|blocker|\bdown\b|launch blocker|критич|блокер|релиз/.test(text)) return "P0";
  if (/\bp1\b|\bhigh\b|\bcore\b|\bmust\b|важн|ключев|срочн/.test(text)) return "P1";
  if (/\bp3\b|\blow\b|\blater\b|nice to have|потом|низк/.test(text)) return "P3";
  return "P2";
}

function inferProductArea(rawInput, hints = {}) {
  if (compact(hints.product_area)) return slugify(hints.product_area);
  const match = PRODUCT_AREA_PATTERNS.find(({ pattern }) => pattern.test(rawInput));
  return match?.area ?? "product_ops";
}

function buildTitle(rawInput, type, productArea, hints = {}) {
  if (compact(hints.title)) return titleCase(hints.title);
  const sentence = firstSentence(rawInput).replace(/^(please|need to|нужно|надо)\s+/i, "");
  const fallback = `${type.replace("_", " ")} for ${productArea.replace(/_/g, " ")}`;
  return titleCase(sentence || fallback);
}

function defaultUserProblem(type, productArea, rawInput) {
  if (type === "bug") {
    return `Пользователь или команда сталкивается с неисправностью в зоне ${productArea}, которая мешает надежному выполнению сценария.`;
  }
  if (VISUAL_TYPES.has(type)) {
    return `Пользователю не хватает ясности, доверия или управляемости в визуальном сценарии ${productArea}.`;
  }
  if (type === "research") {
    return `Команде не хватает проверенного понимания, чтобы принять решение по зоне ${productArea}.`;
  }
  return `Нужно превратить входной запрос в проверяемое улучшение зоны ${productArea}: ${firstSentence(rawInput)}`;
}

function defaultBusinessValue(type, productArea) {
  if (type === "bug") return "Снижает риск поломки ключевого сценария и повышает надежность продукта.";
  if (type === "growth" || type === "seo") return "Помогает привлекать или активировать больше релевантных пользователей.";
  if (type === "monetization") return "Проясняет путь к выручке без разрушения доверия к продукту.";
  if (type === "research") return "Снижает риск неверной продуктовой ставки перед реализацией.";
  return `Усиливает качество принятия решения и скорость исполнения в зоне ${productArea}.`;
}

function defaultTechnicalScope(type, productArea) {
  if (TECHNICAL_TASK_TYPES.has(type)) {
    return `Inspect existing contracts, state, routes, tests, and automation docs for ${productArea}; implement the smallest safe change.`;
  }
  if (type === "ux" || type === "design") {
    return "No UI implementation until design scope is approved; prepare contracts, data needs, and acceptance criteria first.";
  }
  return "No code change by default; produce a decision-ready brief or operational update.";
}

function defaultDesignScope(type, rawInput) {
  if (!VISUAL_TYPES.has(type)) return "";
  return `Define the exact screen, state, or interaction affected by: ${firstSentence(rawInput)}`;
}

function defaultAcceptanceCriteria(taskLike) {
  const criteria = [
    "The user problem, scope, non-goals, and expected outcome are explicit.",
    "The implementation can be verified with the listed test plan.",
    "The task links back to Notion and GitHub when engineering work is required."
  ];
  if (taskLike.requires_design_approval) {
    criteria.push("Visual or UI implementation is blocked until design approval is recorded.");
  }
  if (taskLike.type === "bug") {
    criteria.push("The regression is reproduced or described, fixed at the root cause, and covered by a relevant check.");
  }
  return criteria;
}

function defaultTestPlan(taskLike) {
  const checks = ["Run the narrowest relevant automated check for the changed surface."];
  if (taskLike.requires_github_issue) checks.push("Confirm the GitHub issue body has acceptance criteria and rollback notes.");
  if (taskLike.requires_design_approval) checks.push("Confirm design approval before any UI code is assigned to Codex.");
  checks.push("Run a self-review for correctness, drift, and remaining risks before marking Done.");
  return checks;
}

function defaultNonGoals(taskLike) {
  const nonGoals = ["Do not invent APIs, endpoints, metrics, or user behavior."];
  if (taskLike.requires_design_approval) {
    nonGoals.push("Do not implement UI code before approved design scope exists.");
  }
  nonGoals.push("Do not broaden the task beyond the named product area without a new decision.");
  return nonGoals;
}

function buildDedupeKey(type, productArea, title) {
  return `${type}:${productArea}:${slugify(title)}`;
}

function normalizeTask(input) {
  const rawInput = compact(input.raw_input ?? input.text ?? input.note);
  if (!rawInput) throw new Error("raw_input is required.");

  const hints = input.hints ?? {};
  const type = inferType(rawInput, hints);
  const priority = inferPriority(rawInput, hints);
  const productArea = inferProductArea(rawInput, hints);
  const title = buildTitle(rawInput, type, productArea, hints);
  const requiresDesignApproval =
    hasOwn(hints, "requires_design_approval")
      ? Boolean(hints.requires_design_approval)
      : VISUAL_TYPES.has(type) || /\bui\b|screen|visual|design|lovable|макет|экран|визуал/i.test(rawInput);
  const requiresGithubIssue =
    hasOwn(hints, "requires_github_issue")
      ? Boolean(hints.requires_github_issue)
      : ENGINEERING_TYPES.has(type);
  const requiresCodexExecution =
    hasOwn(hints, "requires_codex_execution")
      ? Boolean(hints.requires_codex_execution)
      : requiresGithubIssue;

  const taskSeed = { type, product_area: productArea, requires_design_approval: requiresDesignApproval, requires_github_issue: requiresGithubIssue };
  const acceptanceCriteria = hasOwn(hints, "acceptance_criteria")
    ? toArray(hints.acceptance_criteria)
    : defaultAcceptanceCriteria(taskSeed);
  const testPlan = hasOwn(hints, "test_plan") ? toArray(hints.test_plan) : defaultTestPlan(taskSeed);
  const nonGoals = hasOwn(hints, "non_goals") ? toArray(hints.non_goals) : defaultNonGoals(taskSeed);
  const dedupeKey = compact(hints.dedupe_key) || buildDedupeKey(type, productArea, title);

  const task = {
    title,
    summary: compact(hints.summary) || firstSentence(rawInput),
    type,
    priority,
    status: STATUSES.includes(hints.status) ? hints.status : "Inbox",
    product_area: productArea,
    user_problem: hasOwn(hints, "user_problem") ? compact(hints.user_problem) : defaultUserProblem(type, productArea, rawInput),
    business_value: hasOwn(hints, "business_value") ? compact(hints.business_value) : defaultBusinessValue(type, productArea),
    technical_scope: hasOwn(hints, "technical_scope") ? compact(hints.technical_scope) : defaultTechnicalScope(type, productArea),
    design_scope: hasOwn(hints, "design_scope") ? compact(hints.design_scope) : defaultDesignScope(type, rawInput),
    acceptance_criteria: acceptanceCriteria,
    test_plan: testPlan,
    risks: hasOwn(hints, "risks") ? toArray(hints.risks) : ["Task may drift if Notion and GitHub links are not kept in sync."],
    dependencies: hasOwn(hints, "dependencies") ? toArray(hints.dependencies) : [],
    non_goals: nonGoals,
    requires_design_approval: requiresDesignApproval,
    requires_github_issue: requiresGithubIssue,
    requires_codex_execution: requiresCodexExecution,
    dedupe_key: dedupeKey,
    codex_brief: "",
    notion_page_id: compact(hints.notion_page_id),
    github_issue_url: compact(hints.github_issue_url),
    github_pr_url: compact(hints.github_pr_url),
    source: compact(input.source) || "founder_input",
    raw_input: rawInput
  };

  const qualityGate = applyQualityGate(task);
  task.status = qualityGate.allowed_ready ? "Ready" : "Needs Clarification";
  return { task, quality_gate: qualityGate };
}

function applyQualityGate(task) {
  const missing = [];
  const checks = [
    ["user_problem", compact(task.user_problem)],
    ["business_value", compact(task.business_value)],
    ["scope", compact(task.technical_scope) || compact(task.design_scope)],
    ["non_goals", task.non_goals?.length > 0],
    ["acceptance_criteria", task.acceptance_criteria?.length > 0],
    ["test_plan", task.test_plan?.length > 0],
    ["risk_notes", task.risks?.length > 0],
    ["design_approval_flag", typeof task.requires_design_approval === "boolean"]
  ];

  for (const [field, ok] of checks) {
    if (!ok) missing.push(field);
  }

  if (task.requires_design_approval && !compact(task.design_scope)) {
    missing.push("design_scope");
  }

  return {
    allowed_ready: missing.length === 0,
    missing,
    notes: missing.length === 0
      ? ["Task is allowed to become Ready."]
      : [`Task must stay Needs Clarification until missing fields are fixed: ${missing.join(", ")}.`]
  };
}

function tokenSet(value) {
  return new Set(
    compact(value)
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((token) => token.length > 2)
  );
}

function titleSimilarity(a, b) {
  const left = tokenSet(a);
  const right = tokenSet(b);
  if (left.size === 0 || right.size === 0) return 0;
  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return intersection / union;
}

function findDuplicate(task, existingTasks = []) {
  const normalizedExisting = Array.isArray(existingTasks) ? existingTasks : [];
  const exact = normalizedExisting.find((candidate) => compact(candidate.dedupe_key) === task.dedupe_key);
  if (exact) {
    return {
      action: "update_existing",
      confidence: 1,
      reason: "Exact dedupe_key match.",
      matched_task: exact
    };
  }

  let best = null;
  for (const candidate of normalizedExisting) {
    const score = titleSimilarity(task.title, candidate.title ?? candidate.name ?? "");
    const sameArea = compact(candidate.product_area) === task.product_area;
    const sameType = compact(candidate.type) === task.type;
    const adjusted = score + (sameArea ? 0.12 : 0) + (sameType ? 0.08 : 0);
    if (!best || adjusted > best.confidence) {
      best = {
        action: adjusted >= 0.72 ? "update_existing" : adjusted >= 0.45 ? "needs_clarification" : "create_new",
        confidence: Number(adjusted.toFixed(3)),
        reason: sameArea || sameType
          ? "Title similarity with same area or type."
          : "Title similarity only.",
        matched_task: candidate
      };
    }
  }

  if (best && best.action !== "create_new") return best;
  return {
    action: "create_new",
    confidence: best?.confidence ?? 0,
    reason: "No likely duplicate found.",
    matched_task: null
  };
}

function markdownList(items) {
  return items?.length ? items.map((item) => `- ${item}`).join("\n") : "- None.";
}

function generateCodexBrief(task) {
  const relevantFiles = [
    "README.md",
    "AGENTS.md",
    "AUTOMATIONS_OPERATING_MODEL.md",
    ".codex/automations/README.md",
    task.product_area === "automation" ? "scripts/codex/*" : "",
    task.product_area === "automation" ? ".codex/automations/*" : "",
    task.product_area === "result_flow" ? "src/screens/result/*" : "",
    task.product_area === "human_review" ? "server/routes/humanReview.integration.test.ts" : ""
  ].filter(Boolean);

  return [
    `# Codex Implementation Brief: ${task.title}`,
    "",
    "## Objective",
    task.summary,
    "",
    "## Product Rationale",
    task.business_value,
    "",
    "## User Problem",
    task.user_problem,
    "",
    "## Relevant Files To Inspect",
    markdownList(relevantFiles),
    "",
    "## Implementation Constraints",
    markdownList([
      "Keep changes scoped to the product area and existing architecture.",
      "Do not invent APIs, endpoints, metrics, or user behavior.",
      "Use env vars for secrets; never hardcode credentials.",
      task.requires_design_approval
        ? "Do not implement UI before approved design scope is attached."
        : "Do not add UI scope unless explicitly required."
    ]),
    "",
    "## Scope",
    task.technical_scope || task.design_scope,
    "",
    "## Non-goals",
    markdownList(task.non_goals),
    "",
    "## Acceptance Criteria",
    markdownList(task.acceptance_criteria),
    "",
    "## Test Plan",
    markdownList(task.test_plan),
    "",
    "## Risks",
    markdownList(task.risks),
    "",
    "## Rollback Notes",
    "Revert the implementation commit or disable the affected automation/feature flag if one is introduced.",
    "",
    "## Self-review Checklist",
    markdownList([
      "Correctness and lifecycle state are coherent.",
      "Notion/GitHub links are preserved or prepared in dry-run.",
      "No secrets or server-only data are exposed.",
      "The task remains traceable to the original founder input."
    ]),
    ""
  ].join("\n");
}

function buildGithubIssue(task) {
  const labels = [
    `type:${TYPE_LABELS[task.type]}`,
    `priority:${task.priority}`,
    `area:${task.product_area}`
  ];
  if (task.requires_design_approval) labels.push("needs-design-approval");
  if (task.status === "Ready" && task.requires_codex_execution) labels.push("ready-for-codex");

  const body = [
    "## Context",
    task.summary,
    "",
    "## User problem",
    task.user_problem,
    "",
    "## Product value",
    task.business_value,
    "",
    "## Scope",
    task.technical_scope || task.design_scope || "TBD.",
    "",
    "## Non-goals",
    markdownList(task.non_goals),
    "",
    "## Acceptance criteria",
    markdownList(task.acceptance_criteria),
    "",
    "## Test plan",
    markdownList(task.test_plan),
    "",
    "## UX/design notes",
    task.requires_design_approval ? task.design_scope || "Design approval is required before UI implementation." : "No visual scope expected.",
    "",
    "## Risks",
    markdownList(task.risks),
    "",
    "## Links",
    markdownList([
      task.notion_page_id ? `Notion: ${task.notion_page_id}` : "Notion: pending",
      task.github_pr_url ? `PR: ${task.github_pr_url}` : "PR: pending"
    ]),
    "",
    "## Codex implementation brief",
    task.codex_brief || generateCodexBrief(task)
  ].join("\n");

  return {
    title: `[${TYPE_LABELS[task.type]}] ${task.title}`,
    body,
    labels
  };
}

function buildNotionTaskPayload(task) {
  return {
    Name: task.title,
    Type: task.type,
    Status: task.status,
    Priority: task.priority,
    "Product Area": task.product_area,
    Source: task.source,
    "User Problem": task.user_problem,
    "Business Value": task.business_value,
    "Technical Scope": task.technical_scope,
    "Design Scope": task.design_scope,
    "Acceptance Criteria": task.acceptance_criteria,
    "Test Plan": task.test_plan,
    Risks: task.risks,
    Dependencies: task.dependencies,
    "Requires Design Approval": task.requires_design_approval,
    "Requires GitHub Issue": task.requires_github_issue,
    "Requires Codex Execution": task.requires_codex_execution,
    "Dedupe Key": task.dedupe_key,
    "GitHub Issue URL": task.github_issue_url,
    "GitHub PR URL": task.github_pr_url,
    "Codex Brief": task.codex_brief,
    "Last Sync": new Date().toISOString(),
    "Execution Summary": "",
    "Remaining Risks": task.risks
  };
}

function buildIntents(task, duplicate) {
  const notionOperation = duplicate.action === "update_existing" ? "update" : "create";
  const githubOperation = task.requires_github_issue
    ? duplicate.action === "update_existing" && task.github_issue_url
      ? "update"
      : "create"
    : "skip";

  return {
    notion: {
      operation: notionOperation,
      target: task.notion_page_id || "NOTION_DATABASE_ID",
      payload: buildNotionTaskPayload(task)
    },
    github: {
      operation: githubOperation,
      repository: "${GITHUB_OWNER}/${GITHUB_REPO}",
      issue: task.requires_github_issue ? buildGithubIssue(task) : null
    }
  };
}

function syncGithubEvent(task, event) {
  const next = { ...task };
  const type = compact(event?.type);
  if (type === "issue_opened") {
    next.status = event.labels?.includes("in-progress") ? "In Progress" : "Ready";
    if (event.url) next.github_issue_url = event.url;
  } else if (type === "branch_created") {
    next.status = "In Progress";
  } else if (type === "pr_opened") {
    next.status = "In Review";
    if (event.url) next.github_pr_url = event.url;
  } else if (type === "pr_merged") {
    next.status = "Done";
    if (event.url) next.github_pr_url = event.url;
  } else if (type === "pr_closed_unmerged") {
    next.status = event.unresolved_risk ? "Blocked" : "Needs Clarification";
    if (event.url) next.github_pr_url = event.url;
  } else if (type === "issue_closed") {
    next.status = event.unresolved_risk ? "Blocked" : "Done";
    if (event.url) next.github_issue_url = event.url;
  }
  return next;
}

function daysBetween(left, right) {
  const a = new Date(left).getTime();
  const b = new Date(right).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.floor((b - a) / 86400000));
}

function healthAudit(input = {}) {
  const tasks = Array.isArray(input.tasks) ? input.tasks : [];
  const issues = Array.isArray(input.github_issues) ? input.github_issues : [];
  const prs = Array.isArray(input.github_prs) ? input.github_prs : [];
  const now = input.now || new Date().toISOString();
  const staleDays = Number(input.stale_task_days ?? 14);

  const taskIssueUrls = new Set(tasks.map((task) => compact(task.github_issue_url)).filter(Boolean));
  const taskPrUrls = new Set(tasks.map((task) => compact(task.github_pr_url)).filter(Boolean));
  const taskKeys = new Map();
  const duplicates = [];

  for (const task of tasks) {
    const key = compact(task.dedupe_key);
    if (!key) continue;
    if (taskKeys.has(key)) duplicates.push({ dedupe_key: key, tasks: [taskKeys.get(key), task] });
    else taskKeys.set(key, task);
  }

  return {
    generated_at: now,
    summary: {
      task_count: tasks.length,
      github_issue_count: issues.length,
      github_pr_count: prs.length
    },
    findings: {
      notion_tasks_without_github_issues: tasks.filter(
        (task) => task.requires_github_issue && !compact(task.github_issue_url)
      ),
      github_issues_without_notion_links: issues.filter(
        (issue) =>
          !taskIssueUrls.has(compact(issue.url)) &&
          !/(notion:\s*(https?:\/\/|[0-9a-f-]{16,})|notion\.so)/i.test(compact(issue.body))
      ),
      prs_without_linked_tasks: prs.filter(
        (pr) =>
          !taskPrUrls.has(compact(pr.url)) &&
          !/(notion:\s*(https?:\/\/|[0-9a-f-]{16,})|notion\.so|dedupe[_\s-]?key)/i.test(compact(pr.body))
      ),
      done_tasks_without_pr_or_result: tasks.filter(
        (task) => task.status === "Done" && !compact(task.github_pr_url) && !compact(task.execution_summary)
      ),
      ready_tasks_missing_acceptance_criteria: tasks.filter(
        (task) => task.status === "Ready" && toArray(task.acceptance_criteria).length === 0
      ),
      stale_in_progress_tasks: tasks.filter(
        (task) => task.status === "In Progress" && daysBetween(task.updated_at || task.last_sync, now) > staleDays
      ),
      duplicate_or_overlapping_tasks: duplicates,
      design_tasks_missing_approval: tasks.filter(
        (task) => task.requires_design_approval && task.design_approved !== true
      ),
      high_priority_blocked_tasks: tasks.filter(
        (task) => (task.priority === "P0" || task.priority === "P1") && task.status === "Blocked"
      )
    },
    recommended_next_actions: [
      "Resolve orphan GitHub issues by adding Notion links or closing duplicates.",
      "Move Ready tasks without acceptance criteria back to Needs Clarification.",
      "Escalate stale In Progress tasks with owner, blocker, and next checkpoint."
    ]
  };
}

function requiredEnvFor(task) {
  const required = ["ACTIVE_HOLIDAYS_ENV"];
  if (task.requires_github_issue) required.push("GITHUB_TOKEN", "GITHUB_OWNER", "GITHUB_REPO");
  required.push("NOTION_API_KEY", "NOTION_DATABASE_ID");
  return required;
}

function notionRichText(value) {
  const text = Array.isArray(value) ? value.join("\n") : compact(value);
  return { rich_text: [{ text: { content: text.slice(0, 1900) } }] };
}

function notionProperties(task) {
  return {
    Name: { title: [{ text: { content: task.title.slice(0, 1900) } }] },
    Type: { select: { name: task.type } },
    Status: { select: { name: task.status } },
    Priority: { select: { name: task.priority } },
    "Product Area": notionRichText(task.product_area),
    Source: notionRichText(task.source),
    "User Problem": notionRichText(task.user_problem),
    "Business Value": notionRichText(task.business_value),
    "Technical Scope": notionRichText(task.technical_scope),
    "Design Scope": notionRichText(task.design_scope),
    "Acceptance Criteria": notionRichText(task.acceptance_criteria),
    "Test Plan": notionRichText(task.test_plan),
    Risks: notionRichText(task.risks),
    Dependencies: notionRichText(task.dependencies),
    "Requires Design Approval": { checkbox: task.requires_design_approval },
    "Requires GitHub Issue": { checkbox: task.requires_github_issue },
    "Requires Codex Execution": { checkbox: task.requires_codex_execution },
    "Dedupe Key": notionRichText(task.dedupe_key),
    "GitHub Issue URL": task.github_issue_url ? { url: task.github_issue_url } : { url: null },
    "GitHub PR URL": task.github_pr_url ? { url: task.github_pr_url } : { url: null },
    "Codex Brief": notionRichText(task.codex_brief),
    "Last Sync": { date: { start: new Date().toISOString() } },
    "Execution Summary": notionRichText(""),
    "Remaining Risks": notionRichText(task.risks)
  };
}

async function writeGithubIssue(task, issue, env) {
  const owner = env.GITHUB_OWNER;
  const repo = env.GITHUB_REPO;
  const issueNumber = task.github_issue_url?.match(/\/issues\/(\d+)/)?.[1];
  const url = issueNumber
    ? `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`
    : `https://api.github.com/repos/${owner}/${repo}/issues`;
  const response = await fetch(url, {
    method: issueNumber ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(issue)
  });
  if (!response.ok) {
    throw new Error(`GitHub issue write failed (${response.status}): ${await response.text()}`);
  }
  return response.json();
}

async function writeNotionTask(task, env) {
  const payload = task.notion_page_id
    ? { properties: notionProperties(task) }
    : { parent: { database_id: env.NOTION_DATABASE_ID }, properties: notionProperties(task) };
  const response = await fetch(
    task.notion_page_id ? `https://api.notion.com/v1/pages/${task.notion_page_id}` : "https://api.notion.com/v1/pages",
    {
      method: task.notion_page_id ? "PATCH" : "POST",
      headers: {
        Authorization: `Bearer ${env.NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );
  if (!response.ok) {
    throw new Error(`Notion task write failed (${response.status}): ${await response.text()}`);
  }
  return response.json();
}

async function maybeWriteExternal({ mode, allowExternalWrites, task, intents, env }) {
  if (mode !== "production") {
    return { write_performed: false, reason: "dry-run mode is default", results: {} };
  }
  if (allowExternalWrites !== true) {
    throw new Error("production mode requires allow_external_writes=true.");
  }

  const missing = requiredEnvFor(task).filter((key) => !compact(env[key]));
  if (missing.length > 0) {
    throw new Error(`Missing required env vars for production mode: ${missing.join(", ")}`);
  }

  const results = {};
  if (task.requires_github_issue && intents.github.issue) {
    results.github_issue = await writeGithubIssue(task, intents.github.issue, env);
    task.github_issue_url = results.github_issue.html_url || task.github_issue_url;
  }
  results.notion_task = await writeNotionTask(task, env);
  task.notion_page_id = results.notion_task.id || task.notion_page_id;
  return { write_performed: true, reason: "production writes completed", results };
}

async function run(parameters = {}) {
  if (parameters.workflow === "health_audit" || parameters.health_audit === true) {
    return {
      schema_version: "active-holidays-task-orchestrator/v1",
      mode: parameters.mode || "dry-run",
      dry_run: parameters.mode !== "production",
      health_audit: healthAudit(parameters)
    };
  }

  const input = parameters.input ?? parameters;
  const mode = input.mode || parameters.mode || "dry-run";
  const { task, quality_gate: initialQualityGate } = normalizeTask(input);
  const dedupe = findDuplicate(task, input.existing_tasks ?? parameters.existing_tasks ?? []);

  if (dedupe.action === "needs_clarification") {
    task.status = "Needs Clarification";
    task.risks = [...task.risks, "Possible duplicate needs human confirmation before creating a new task."];
  } else if (dedupe.action === "update_existing" && dedupe.matched_task) {
    task.notion_page_id = task.notion_page_id || compact(dedupe.matched_task.notion_page_id);
    task.github_issue_url = task.github_issue_url || compact(dedupe.matched_task.github_issue_url);
  }

  const qualityGate = applyQualityGate(task);
  if (!qualityGate.allowed_ready) task.status = "Needs Clarification";
  task.codex_brief = generateCodexBrief(task);

  if (parameters.github_event) {
    Object.assign(task, syncGithubEvent(task, parameters.github_event));
  }

  const intents = buildIntents(task, dedupe);
  const externalWriteState = await maybeWriteExternal({
    mode,
    allowExternalWrites: parameters.allow_external_writes === true,
    task,
    intents,
    env: parameters.env ?? process.env
  });

  return {
    schema_version: "active-holidays-task-orchestrator/v1",
    mode,
    dry_run: mode !== "production",
    task,
    quality_gate: qualityGate.allowed_ready ? qualityGate : initialQualityGate,
    dedupe,
    notion: intents.notion,
    github: intents.github,
    codex_brief: task.codex_brief,
    lovable: {
      direct_api_verified: false,
      integration_bridge: "GitHub issue / branch / PR",
      note: "No direct Lovable API or repo config was detected; route Lovable-synced work through GitHub."
    },
    external_write_state: externalWriteState
  };
}

async function main() {
  const parameters = typeof yepcode !== "undefined" ? yepcode.context.parameters : {};
  try {
    return await run(parameters);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    throw error;
  }
}

function parseCliArgs(argv) {
  const args = { _: [] };
  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }
    const key = token.slice(2).replace(/-+/g, "_");
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) args[key] = true;
    else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

function loadCliInput(args) {
  if (args.input) {
    const fullPath = path.resolve(process.cwd(), args.input);
    const parsed = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    if (Array.isArray(parsed)) {
      if (args.case) return parsed.find((item) => item.id === args.case) ?? parsed[0];
      return parsed[0];
    }
    return parsed;
  }
  if (args.raw_input) return { raw_input: args.raw_input };
  const stdin = fs.readFileSync(0, "utf8").trim();
  if (stdin) return JSON.parse(stdin);
  throw new Error("Pass --input <json> or --raw-input <text>.");
}

async function runCli() {
  const args = parseCliArgs(process.argv);
  const mode = args.mode || "dry-run";
  const input = loadCliInput(args);
  const result = await run({
    ...input,
    mode,
    workflow: args.workflow,
    health_audit: args.health_audit === true,
    allow_external_writes: args.allow_external_writes === "true"
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

module.exports = {
  TASK_TYPES,
  main,
  run,
  runCli,
  normalizeTask,
  applyQualityGate,
  findDuplicate,
  generateCodexBrief,
  buildGithubIssue,
  buildNotionTaskPayload,
  syncGithubEvent,
  healthAudit,
  titleSimilarity
};
