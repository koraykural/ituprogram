import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { db } from "@/lib/db";
import {
  fetchDersPlanPage,
  fetchPrograms,
  fetchCoursePlanList,
  fetchCoursePlanDetail,
  fetchElectiveGroup,
} from "./fetch";
import { isFresh, WEEK } from "@/lib/freshness";

const UNDERGRADUATE_CODE = "lisans";

interface Faculty {
  id: number;
  name: string;
}
interface PlanType {
  code: string;
  name: string;
}
interface CoursePlanRef {
  id: number;
  title: string;
}

interface ParsedEntry {
  courseCode: string;
  courseTitle: string;
  language: string | null;
  credit: number | null;
  ects: number | null;
}

interface ParsedElectiveSlot {
  obsGroupId: number;
  name: string;
  credit: number | null;
}

interface ParsedSemester {
  number: number;
  entries: ParsedEntry[];
  electiveSlots: ParsedElectiveSlot[];
}

// ── Parsers ───────────────────────────────────────────────────────────────────

function parseFacultiesAndPlanTypes(html: string) {
  const $ = cheerio.load(html);

  const faculties: Faculty[] = [];
  $("#akademikBirimId option").each((_, el) => {
    const value = $(el).attr("value");
    const name = $(el).text().trim();
    if (value) faculties.push({ id: parseInt(value, 10), name });
  });

  const planTypes: PlanType[] = [];
  $("#planTipiId option").each((_, el) => {
    const value = $(el).attr("value");
    const name = $(el).text().trim();
    if (value) planTypes.push({ code: value, name });
  });

  return { faculties, planTypes };
}

function parseCoursePlanList(html: string): CoursePlanRef[] {
  const $ = cheerio.load(html);
  const plans: CoursePlanRef[] = [];
  $("tbody tr").each((_, row) => {
    const link = $(row).find("a");
    const href = link.attr("href") ?? "";
    const title = $(row).find("td").last().text().trim();
    const match = href.match(/\/DersPlanDetay\/(\d+)/);
    if (match) plans.push({ id: parseInt(match[1], 10), title });
  });
  return plans;
}

function parseCoursePlanDetail(html: string): ParsedSemester[] {
  const $ = cheerio.load(html);
  const semesters: ParsedSemester[] = [];

  const semesterH2s = $("h2").toArray().slice(1); // first h2 is the plan title

  semesterH2s.forEach((h2El) => {
    const semMatch = $(h2El)
      .text()
      .trim()
      .match(/^(\d+)/);
    if (!semMatch) return;

    const entries: ParsedEntry[] = [];
    const electiveSlots: ParsedElectiveSlot[] = [];

    let sibling = h2El.nextSibling;
    while (sibling) {
      const el = sibling as AnyNode;
      if (el.type === "tag" && el.tagName === "h2") break;
      if (el.type === "tag" && el.tagName === "table") {
        $(el)
          .find("tbody tr")
          .each((_, row) => {
            const cells = $(row).find("td");
            if (cells.length < 5) return;

            const codeCell = cells.eq(0);
            const rawCode = codeCell.text().trim();
            const creditStr = cells.eq(4).text().trim();
            const ectsStr = cells.eq(5)?.text().trim() ?? null;

            const isElectiveSlot =
              rawCode === "Courses" || rawCode === "Dersler";
            if (isElectiveSlot) {
              // Elective slot — "Courses"/"Dersler" is a link to a set of selectable courses
              const href = codeCell.find("a").attr("href") ?? "";
              const grupMatch = href.match(/grupId=(\d+)/);
              if (grupMatch) {
                electiveSlots.push({
                  obsGroupId: parseInt(grupMatch[1], 10),
                  name: cells.eq(1).text().trim(),
                  credit: parseFloat(creditStr) || null,
                });
              }
            } else {
              // Compulsory course
              entries.push({
                courseCode: rawCode,
                courseTitle: cells.eq(1).text().trim(),
                language: cells.eq(2).text().trim() || null,
                credit: parseFloat(creditStr) || null,
                ects: parseFloat(ectsStr ?? "") || null,
              });
            }
          });
      }
      sibling = sibling.nextSibling;
    }

    if (entries.length > 0 || electiveSlots.length > 0) {
      semesters.push({
        number: parseInt(semMatch[1], 10),
        entries,
        electiveSlots,
      });
    }
  });

  return semesters;
}

function parseElectiveGroupCourses(html: string) {
  const $ = cheerio.load(html);
  const courses: {
    courseCode: string;
    courseTitle: string;
    language: string | null;
    credit: number | null;
    ects: number | null;
  }[] = [];

  $("tbody tr").each((_, row) => {
    const cells = $(row).find("td");
    if (cells.length < 3) return;
    const code = cells.eq(0).find("a").text().trim();
    if (!code) return;
    const name =
      cells
        .eq(0)
        .html()!
        .split(/<br\s*\/?>/i)[1]
        ?.replace(/<[^>]+>/g, "")
        .trim() ?? "";
    courses.push({
      courseCode: code,
      courseTitle: name,
      language: cells.eq(1).text().trim() || null,
      credit: parseFloat(cells.eq(2).text().trim()) || null,
      ects: parseFloat(cells.eq(3).text().trim()) || null,
    });
  });

  return courses;
}

// ── Scraper ───────────────────────────────────────────────────────────────────

async function upsertUniquePlanEntries(entries: ParsedEntry[]) {
  await db.$transaction(
    entries.map((e) =>
      db.uniquePlanEntry.upsert({
        where: { courseCode: e.courseCode },
        create: {
          courseCode: e.courseCode,
          courseTitle: e.courseTitle,
          language: e.language,
          credit: e.credit,
          ects: e.ects,
        },
        update: {
          courseTitle: e.courseTitle,
          language: e.language,
          credit: e.credit,
          ects: e.ects,
        },
      }),
    ),
  );
}

// Dedup cache for elective group HTTP fetches within a single run
type GroupCourses = ReturnType<typeof parseElectiveGroupCourses>;
const inMemoryGroupCache = new Map<number, GroupCourses>();

async function fetchGroupCourses(obsGroupId: number): Promise<GroupCourses> {
  if (inMemoryGroupCache.has(obsGroupId))
    return inMemoryGroupCache.get(obsGroupId)!;
  const html = await fetchElectiveGroup(obsGroupId);
  const courses = parseElectiveGroupCourses(html);
  inMemoryGroupCache.set(obsGroupId, courses);
  await new Promise((r) => setTimeout(r, 150));
  return courses;
}

async function scrapeCoursePlans(
  programCode: string,
  planThreshold: number,
  groupThreshold: number,
) {
  const listHtml = await fetchCoursePlanList(programCode);
  const planRefs = parseCoursePlanList(listHtml);
  if (planRefs.length === 0) return;

  for (const planRef of planRefs) {
    const existing = await db.coursePlan.findUnique({
      where: { id: planRef.id },
      select: { updatedAt: true },
    });
    if (isFresh(existing?.updatedAt, planThreshold)) {
      console.log(`[plan-scraper] Plan ${planRef.id}: fresh, skipping`);
      continue; // cascade freshness — semesters/groups/entries are all still valid
    }

    await new Promise((r) => setTimeout(r, 150));

    let detailHtml: string;
    try {
      detailHtml = await fetchCoursePlanDetail(planRef.id);
    } catch (err) {
      console.error(`[plan-scraper] Failed plan detail ${planRef.id}:`, err);
      continue;
    }

    const semesters = parseCoursePlanDetail(detailHtml);

    await db.coursePlan.upsert({
      where: { id: planRef.id },
      create: { id: planRef.id, title: planRef.title, programCode },
      update: { title: planRef.title },
    });

    // Delete in FK order: entries first, then semesters
    const semIds = (
      await db.planSemester.findMany({
        where: { planId: planRef.id },
        select: { id: true },
      })
    ).map((s) => s.id);
    if (semIds.length > 0) {
      await db.planEntry.deleteMany({ where: { semesterId: { in: semIds } } });
    }
    await db.planSemester.deleteMany({ where: { planId: planRef.id } });

    for (const sem of semesters) {
      const created = await db.planSemester.create({
        data: { planId: planRef.id, number: sem.number },
      });

      if (sem.entries.length > 0) {
        await db.planEntry.createMany({
          data: sem.entries.map((e) => ({ semesterId: created.id, ...e })),
        });
        await upsertUniquePlanEntries(sem.entries);
      }

      for (const slot of sem.electiveSlots) {
        const group = await db.electiveGroup.create({
          data: {
            semesterId: created.id,
            obsGroupId: slot.obsGroupId,
            name: slot.name,
            credit: slot.credit,
          },
        });

        // Check freshness via the oldest PlanEntry in this group
        const oldest = await db.planEntry.findFirst({
          where: { electiveGroupId: group.id },
          orderBy: { updatedAt: "asc" },
          select: { updatedAt: true },
        });
        if (isFresh(oldest?.updatedAt, groupThreshold)) {
          console.log(
            `[plan-scraper] Elective group ${slot.obsGroupId} (${slot.name}): fresh, skipping`,
          );
          continue;
        }

        try {
          const courses = await fetchGroupCourses(slot.obsGroupId);
          if (courses.length > 0) {
            await db.planEntry.createMany({
              data: courses.map((c) => ({ electiveGroupId: group.id, ...c })),
              skipDuplicates: true,
            });
            await upsertUniquePlanEntries(courses);
          }
          console.log(
            `[plan-scraper] Elective group ${slot.obsGroupId} (${slot.name}): ${courses.length} courses`,
          );
        } catch (err) {
          console.error(
            `[plan-scraper] Failed elective group ${slot.obsGroupId}:`,
            err,
          );
        }
      }
    }
  }
}

export async function scrapeDersPlan({
  includeCoursePlans = true,
  planThreshold = WEEK,
  groupThreshold = WEEK,
} = {}) {
  console.log("[plan-scraper] Starting...");
  inMemoryGroupCache.clear();

  const html = await fetchDersPlanPage();
  const { faculties, planTypes } = parseFacultiesAndPlanTypes(html);
  console.log(
    `[plan-scraper] ${faculties.length} faculties, ${planTypes.length} plan types`,
  );

  await db.$transaction(
    faculties.map((f) =>
      db.faculty.upsert({
        where: { id: f.id },
        create: f,
        update: { name: f.name },
      }),
    ),
  );

  await db.$transaction(
    planTypes.map((pt) =>
      db.planType.upsert({
        where: { code: pt.code },
        create: pt,
        update: { name: pt.name },
      }),
    ),
  );

  let totalPrograms = 0;
  for (const faculty of faculties) {
    let programs;
    try {
      programs = await fetchPrograms(faculty.id, UNDERGRADUATE_CODE);
    } catch (err) {
      console.error(
        `[plan-scraper] Failed programs for faculty ${faculty.id}:`,
        err,
      );
      continue;
    }
    if (programs.length === 0) continue;

    await db.$transaction(
      programs.map((p) =>
        db.program.upsert({
          where: { code: p.programKodu },
          create: {
            code: p.programKodu,
            name: p.programAdi,
            facultyId: faculty.id,
            planTypeCode: UNDERGRADUATE_CODE,
          },
          update: { name: p.programAdi, facultyId: faculty.id },
        }),
      ),
    );

    if (includeCoursePlans) {
      for (const p of programs) {
        try {
          await scrapeCoursePlans(p.programKodu, planThreshold, groupThreshold);
        } catch (err) {
          console.error(
            `[plan-scraper] Failed course plans for ${p.programKodu}:`,
            err,
          );
        }
        await new Promise((r) => setTimeout(r, 150));
      }
    }

    totalPrograms += programs.length;
    console.log(
      `[plan-scraper] Faculty "${faculty.name}": ${programs.length} programs`,
    );
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`[plan-scraper] Done. Total programs: ${totalPrograms}`);
}
