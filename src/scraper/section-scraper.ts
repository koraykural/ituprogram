import * as cheerio from "cheerio";
import { db } from "@/lib/db";
import { fetchActiveTerm, fetchBranches, fetchSectionsHtml } from "./fetch";
import { isFresh, HOUR } from "@/lib/freshness";

const UNDERGRADUATE = "LS";

interface ParsedSection {
  crn: string;
  courseCode: string;
  courseName: string;
  teachingMethod: string;
  instructor: string;
  buildings: string[];
  days: string[];
  times: string[];
  rooms: string[];
  capacity: number;
  enrolled: number;
  majorRestrictions: string[];
}

// Split a cell's innerHTML on <br> tags and return trimmed non-empty strings
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function splitBr($cell: cheerio.Cheerio<any>): string[] {
  return $cell
    .html()!
    .split(/<br\s*\/?>/i)
    .map((s) => cheerio.load(s).text().trim())
    .filter(Boolean);
}

function parseSectionsHtml(html: string): ParsedSection[] {
  const $ = cheerio.load(html);
  const sections: ParsedSection[] = [];

  $("tbody tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 13) return;

    const crn = cells.eq(0).text().trim();
    if (!crn || !/^\d{5}$/.test(crn)) return;

    const courseCode = cells.eq(1).text().trim();
    const courseName = cells.eq(2).text().trim();
    const teachingMethod = cells.eq(3).text().trim();
    const instructor = cells.eq(4).text().trim();
    const buildings = splitBr(cells.eq(5));
    const days = splitBr(cells.eq(6));
    const times = splitBr(cells.eq(7));
    const rooms = splitBr(cells.eq(8));
    const capacity = parseInt(cells.eq(9).text().trim()) || 0;
    const enrolled = parseInt(cells.eq(10).text().trim()) || 0;
    const majorRestrictions = cells
      .eq(12)
      .text()
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && s !== "-");

    sections.push({
      crn,
      courseCode,
      courseName,
      teachingMethod,
      instructor,
      buildings,
      days,
      times,
      rooms,
      capacity,
      enrolled,
      majorRestrictions,
    });
  });

  return sections;
}

export async function scrapeSections({ threshold = HOUR } = {}) {
  console.log("[section-scraper] Starting...");

  const { aktifDonem } = await fetchActiveTerm(UNDERGRADUATE);
  console.log(`[section-scraper] Active term: ${aktifDonem}`);

  const branches = await fetchBranches(UNDERGRADUATE);
  console.log(`[section-scraper] ${branches.length} branch codes to scrape`);

  const allCrns: string[] = [];
  let totalSections = 0;

  for (const branch of branches) {
    // Skip branch if its most recently updated section is still fresh
    const newest = await db.section.findFirst({
      where: { courseCode: { startsWith: branch.dersBransKodu } },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });
    if (isFresh(newest?.updatedAt, threshold)) {
      console.log(`[section-scraper] ${branch.dersBransKodu}: fresh, skipping`);
      const existing = await db.section.findMany({
        where: { courseCode: { startsWith: branch.dersBransKodu } },
        select: { crn: true },
      });
      allCrns.push(...existing.map((s) => s.crn));
      continue;
    }

    let html: string;
    try {
      html = await fetchSectionsHtml(UNDERGRADUATE, branch.bransKoduId);
    } catch (err) {
      console.error(`[section-scraper] Failed to fetch branch ${branch.dersBransKodu}:`, err);
      continue;
    }

    const sections = parseSectionsHtml(html);
    if (sections.length === 0) continue;

    await db.$transaction(
      sections.map((s) =>
        db.section.upsert({
          where: { crn: s.crn },
          create: s,
          update: {
            courseCode: s.courseCode,
            courseName: s.courseName,
            teachingMethod: s.teachingMethod,
            instructor: s.instructor,
            buildings: s.buildings,
            days: s.days,
            times: s.times,
            rooms: s.rooms,
            capacity: s.capacity,
            enrolled: s.enrolled,
            majorRestrictions: s.majorRestrictions,
          },
        })
      )
    );

    allCrns.push(...sections.map((s) => s.crn));
    totalSections += sections.length;
    console.log(`[section-scraper] ${branch.dersBransKodu}: ${sections.length} sections`);

    await new Promise((r) => setTimeout(r, 150));
  }

  // Remove sections that no longer exist this semester
  const deleted = await db.section.deleteMany({
    where: { crn: { notIn: allCrns } },
  });
  if (deleted.count > 0) {
    console.log(`[section-scraper] Removed ${deleted.count} stale sections`);
  }

  console.log(`[section-scraper] Done. Total sections: ${totalSections}`);
}
