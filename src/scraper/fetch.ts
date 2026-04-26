import axios from "axios";

const BASE = "https://obs.itu.edu.tr";

async function post<T>(path: string, body: Record<string, string>): Promise<T> {
  const params = new URLSearchParams(body).toString();
  let lastError: unknown;
  for (let i = 0; i < 5; i++) {
    try {
      const res = await axios.post<T>(`${BASE}${path}`, params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      return res.data;
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  throw lastError;
}

async function get<T>(path: string): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < 5; i++) {
    try {
      const res = await axios.get<T>(`${BASE}${path}`);
      return res.data;
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  throw lastError;
}

// ── DersPlan ──────────────────────────────────────────────────────────────────

export interface RawProgram {
  programKodu: string;
  programAdi: string;
}

export function fetchDersPlanPage(): Promise<string> {
  return get<string>("/public/DersPlan/");
}

export function fetchPrograms(birimId: number, planTipiKodu: string): Promise<RawProgram[]> {
  return post<RawProgram[]>("/public/DersPlan/GetAkademikProgramByBirimIdAndPlanTipi", {
    birimId: String(birimId),
    planTipiKodu,
  });
}

export function fetchCoursePlanList(programCode: string): Promise<string> {
  return get<string>(
    `/public/DersPlan/DersPlanlariList?PlanTipiKodu=lisans&programKodu=${programCode}`
  );
}

export function fetchCoursePlanDetail(planId: number): Promise<string> {
  return get<string>(`/public/DersPlan/DersPlanDetay/${planId}`);
}

export function fetchElectiveGroup(grupId: number): Promise<string> {
  return get<string>(`/public/DersPlan/_DersGrupSearch?grupId=${grupId}`);
}

// ── DersProgram ───────────────────────────────────────────────────────────────

export interface RawBranch {
  bransKoduId: number;
  dersBransKodu: string;
}

export function fetchActiveTerm(seviye: string): Promise<{ aktifDonem: string | null }> {
  return get<{ aktifDonem: string | null }>(
    `/public/DersProgram/GetAktifDonemByProgramSeviye?programSeviyeTipiAnahtari=${seviye}`
  );
}

export function fetchBranches(seviye: string): Promise<RawBranch[]> {
  return get<RawBranch[]>(
    `/public/DersProgram/SearchBransKoduByProgramSeviye?programSeviyeTipiAnahtari=${seviye}`
  );
}

export function fetchSectionsHtml(seviye: string, bransKoduId: number): Promise<string> {
  return get<string>(
    `/public/DersProgram/DersProgramSearch?programSeviyeTipiAnahtari=${seviye}&dersBransKoduId=${bransKoduId}`
  );
}
