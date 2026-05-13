const STORAGE_KEY = "ah.case-access.v1";

type CaseAccessMap = Record<string, string>;

function readStorage(): CaseAccessMap {
  if (typeof window === "undefined") return {};
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: CaseAccessMap = {};
    for (const [caseId, token] of Object.entries(parsed)) {
      if (typeof caseId !== "string" || typeof token !== "string") continue;
      if (caseId.trim().length === 0 || token.trim().length < 24) continue;
      out[caseId] = token;
    }
    return out;
  } catch {
    return {};
  }
}

function writeStorage(next: CaseAccessMap): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function storeCaseAccessToken(caseId: string, token: string): void {
  const id = caseId.trim();
  const value = token.trim();
  if (id.length === 0 || value.length < 24) return;
  const current = readStorage();
  current[id] = value;
  writeStorage(current);
}

export function getCaseAccessToken(caseId: string): string | null {
  const id = caseId.trim();
  if (id.length === 0) return null;
  const current = readStorage();
  return current[id] ?? null;
}

export function hasCaseAccessToken(caseId: string): boolean {
  return getCaseAccessToken(caseId) !== null;
}
