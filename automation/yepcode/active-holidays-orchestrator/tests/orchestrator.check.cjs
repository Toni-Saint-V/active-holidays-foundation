const assert = require("node:assert/strict");
const {
  run,
  normalizeTask,
  findDuplicate,
  syncGithubEvent,
  healthAudit
} = require("../workflows/orchestrator.cjs");

async function testFeatureIdeaBecomesStructuredTask() {
  const result = await run({
    raw_input: "Feature idea: add a guided result flow that explains why the trip decision is safe and what to do next.",
    source: "founder_note"
  });

  assert.equal(result.task.type, "feature");
  assert.equal(result.task.status, "Ready");
  assert.ok(result.task.acceptance_criteria.length > 0);
  assert.ok(result.codex_brief.includes("Acceptance Criteria"));
}

async function testBugReportCreatesGithubIssue() {
  const result = await run({
    raw_input: "Bug: human review form can be submitted twice after network retry.",
    source: "qa"
  });

  assert.equal(result.task.type, "bug");
  assert.equal(result.github.operation, "create");
  assert.match(result.github.issue.title, /^\[bug\]/);
  assert.ok(result.github.issue.labels.includes("type:bug"));
}

function testDesignTaskRequiresApproval() {
  const { task } = normalizeTask({
    raw_input: "Design task: prepare Lovable mobile screen for the decision result page."
  });

  assert.equal(task.type, "design");
  assert.equal(task.requires_design_approval, true);
  assert.equal(task.status, "Ready");
}

function testDuplicateTaskIsDetected() {
  const { task } = normalizeTask({
    raw_input: "Improve result decision flow clarity for documents and next steps."
  });
  const duplicate = findDuplicate(task, [
    {
      title: "Improve result decision flow clarity for documents and next steps",
      dedupe_key: task.dedupe_key,
      product_area: task.product_area,
      notion_page_id: "notion-123"
    }
  ]);

  assert.equal(duplicate.action, "update_existing");
  assert.equal(duplicate.matched_task.notion_page_id, "notion-123");
}

function testMissingAcceptanceCriteriaBlocksReadyStatus() {
  const { task, quality_gate: qualityGate } = normalizeTask({
    raw_input: "Make the app better.",
    hints: {
      acceptance_criteria: []
    }
  });

  assert.equal(task.status, "Needs Clarification");
  assert.equal(qualityGate.allowed_ready, false);
  assert.ok(qualityGate.missing.includes("acceptance_criteria"));
}

function testPrUrlCanSyncBackToNotionTask() {
  const { task } = normalizeTask({
    raw_input: "Fix stale task sync between GitHub PRs and Notion."
  });
  const synced = syncGithubEvent(task, {
    type: "pr_opened",
    url: "https://github.com/Toni-Saint-V/active-holidays-foundation/pull/12"
  });

  assert.equal(synced.status, "In Review");
  assert.equal(synced.github_pr_url, "https://github.com/Toni-Saint-V/active-holidays-foundation/pull/12");
}

function testHealthAuditFindsOrphanGithubIssue() {
  const audit = healthAudit({
    tasks: [],
    github_issues: [
      {
        url: "https://github.com/Toni-Saint-V/active-holidays-foundation/issues/77",
        title: "[bug] orphan",
        body: "No linked Notion task."
      }
    ],
    now: "2026-04-24T00:00:00.000Z"
  });

  assert.equal(audit.findings.github_issues_without_notion_links.length, 1);
}

function testHealthAuditFindsStaleNotionTask() {
  const audit = healthAudit({
    tasks: [
      {
        title: "Long-running task",
        status: "In Progress",
        updated_at: "2026-03-01T00:00:00.000Z"
      }
    ],
    now: "2026-04-24T00:00:00.000Z",
    stale_task_days: 14
  });

  assert.equal(audit.findings.stale_in_progress_tasks.length, 1);
}

async function main() {
  await testFeatureIdeaBecomesStructuredTask();
  await testBugReportCreatesGithubIssue();
  testDesignTaskRequiresApproval();
  testDuplicateTaskIsDetected();
  testMissingAcceptanceCriteriaBlocksReadyStatus();
  testPrUrlCanSyncBackToNotionTask();
  testHealthAuditFindsOrphanGithubIssue();
  testHealthAuditFindsStaleNotionTask();
  console.log("orchestrator tests: 8 passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
