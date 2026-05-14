export function buildCalculatingUrl(caseId: string): string {
  const params = new URLSearchParams();
  params.set("caseId", caseId);
  return `/calculating?${params.toString()}`;
}

export function buildResultUrl(caseId: string): string {
  const params = new URLSearchParams();
  params.set("caseId", caseId);
  return `/result?${params.toString()}`;
}

export function buildHumanReviewUrl(caseId: string): string {
  const params = new URLSearchParams();
  params.set("caseId", caseId);
  return `/human-review?${params.toString()}`;
}
