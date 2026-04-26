const KEY = (planId: number) => `ituprogram_crns_${planId}`;

export function saveCrns(planId: number, crns: string[]): void {
  try {
    sessionStorage.setItem(KEY(planId), crns.join(","));
  } catch {}
}

export function loadCrns(planId: number): string[] {
  try {
    const raw = sessionStorage.getItem(KEY(planId));
    return raw ? raw.split(",").filter(Boolean) : [];
  } catch {
    return [];
  }
}
