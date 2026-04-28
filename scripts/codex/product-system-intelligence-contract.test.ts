import { describe, expect, it } from "vitest";
import { buildProductSystemIntelligenceContract } from "./product-system-intelligence-contract";

describe("product system intelligence contract", () => {
  it("keeps Memory MCP as decision memory, not execution eligibility", async () => {
    const contract = await buildProductSystemIntelligenceContract({
      repoRoot: process.cwd(),
      generatedAt: "1970-01-01T00:00:00.000Z"
    });

    expect(contract.layers.memoryMcp.role).toBe("decision-memory");
    expect(contract.layers.memoryMcp.status).toBe("required_not_configured");
    expect(contract.layers.memoryMcp.bindingEvidence.status).toBe("absent");
    expect(contract.layers.memoryMcp.mustNotOwn).toContain("executor eligibility");
    expect(contract.boundaries.gateSnapshotOwnsExecutionEligibility).toBe(true);
    expect(contract.boundaries.noLandgrafApi).toBe(true);
    expect(contract.boundaries.noInventedExternalMemoryEndpoint).toBe(true);
    expect(contract.boundaries.memoryMcpRequiresRealBinding).toBe(true);
  });

  it("keeps GitHub control and LangGraph flows in separate responsibilities", async () => {
    const contract = await buildProductSystemIntelligenceContract({
      repoRoot: process.cwd(),
      generatedAt: "1970-01-01T00:00:00.000Z"
    });

    expect(contract.layers.githubControl.role).toBe("tasks-pr-review-ci-control");
    expect(contract.layers.githubControl.mustNotOwn).toContain("automation gate eligibility");
    expect(contract.layers.langGraphFlows.role).toBe("agent-flow-orchestration");
    expect(contract.layers.langGraphFlows.status).toBe("dependency_present");
    expect(contract.layers.langGraphFlows.mustNotOwn).toContain("durable decision memory");
  });
});
