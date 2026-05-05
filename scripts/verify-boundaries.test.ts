import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { verifyImportBoundaries } from "./verify-boundaries";

async function withFixture(
  files: Record<string, string>,
  run: (root: string) => Promise<void>
): Promise<void> {
  const root = await mkdtemp(path.join(tmpdir(), "ah-boundaries-"));
  try {
    await Promise.all([
      mkdir(path.join(root, "src"), { recursive: true }),
      mkdir(path.join(root, "server"), { recursive: true }),
      mkdir(path.join(root, "shared"), { recursive: true })
    ]);
    for (const [filePath, content] of Object.entries(files)) {
      const absolutePath = path.join(root, filePath);
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, content);
    }
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("verifyImportBoundaries", () => {
  it("passes for allowed contract imports", async () => {
    await withFixture(
      {
        "src/app.ts": 'import type { CaseSummary } from "@shared/contracts";\nexport const ok = true;',
        "server/route.ts": 'import { caseSummarySchema } from "@shared/contracts";\nexport const ok = true;',
        "shared/contracts.ts": "export const ok = true;"
      },
      async (root) => {
        expect(verifyImportBoundaries(root)).toEqual([]);
      }
    );
  });

  it("flags browser imports of server, shared domain, node modules, and process.env", async () => {
    await withFixture(
      {
        "src/bad.ts": [
          'import { runDecision } from "@shared/domain/engine";',
          'import "../shared/domain/engine";',
          'import "../server/routes/cases";',
          'import path from "node:path";',
          "export const value = process.env.SECRET;"
        ].join("\n"),
        "server/route.ts": "export const ok = true;",
        "shared/contracts.ts": "export const ok = true;"
      },
      async (root) => {
        const rules = verifyImportBoundaries(root).map((violation) => violation.rule);
        expect(rules).toEqual(
          expect.arrayContaining([
            "src-no-process-env",
            "src-no-shared-domain",
            "src-no-server-imports",
            "src-no-node-imports"
          ])
        );
        expect(rules.filter((rule) => rule === "src-no-shared-domain")).toHaveLength(2);
      }
    );
  });

  it("ignores forbidden-looking imports in comments and strings", async () => {
    await withFixture(
      {
        "src/commented.ts": [
          "// import '../server/routes/cases';",
          "const example = \"import '@shared/domain/engine'\";",
          "const snippet = `require('node:path')`;",
          "const envExample = 'process.env.SECRET';",
          "export const ok = true;"
        ].join("\n"),
        "server/route.ts": "export const ok = true;",
        "shared/contracts.ts": "export const ok = true;"
      },
      async (root) => {
        expect(verifyImportBoundaries(root)).toEqual([]);
      }
    );
  });

  it("ignores test files under src because they are not browser runtime code", async () => {
    await withFixture(
      {
        "src/component.tsx": "export const ok = true;",
        "src/component.test.ts": 'import path from "node:path";\nexport const ok = path.sep;'
      },
      async (root) => {
        expect(verifyImportBoundaries(root)).toEqual([]);
      }
    );
  });

  it("flags server and shared imports from browser src", async () => {
    await withFixture(
      {
        "src/view.ts": "export const ok = true;",
        "server/bad.ts": 'import "@/view";',
        "shared/bad.ts": 'import "../src/view";'
      },
      async (root) => {
        const violations = verifyImportBoundaries(root);
        expect(violations).toHaveLength(2);
        expect(violations.map((violation) => violation.rule)).toEqual([
          "server-shared-no-src-imports",
          "server-shared-no-src-imports"
        ]);
      }
    );
  });
});
