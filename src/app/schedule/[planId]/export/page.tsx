import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import ExportView from "@/components/ExportView";

export default async function ExportPage({
  params,
  searchParams,
}: {
  params: Promise<{ planId: string }>;
  searchParams: Promise<{ crns?: string }>;
}) {
  const { planId } = await params;
  const { crns } = await searchParams;

  const crnList = crns ? crns.split(",").filter(Boolean) : [];

  const [plan, sections] = await Promise.all([
    db.coursePlan.findUnique({
      where: { id: Number(planId) },
      include: { program: true },
    }),
    crnList.length > 0
      ? db.section.findMany({ where: { crn: { in: crnList } } })
      : [],
  ]);

  if (!plan) notFound();

  const courseCodes = [...new Set(sections.map((s) => s.courseCode))];
  const creditEntries = courseCodes.length > 0
    ? await db.uniquePlanEntry.findMany({
        where: { courseCode: { in: courseCodes } },
        select: { courseCode: true, credit: true },
      })
    : [];
  const creditMap = Object.fromEntries(creditEntries.map((e) => [e.courseCode, e.credit]));

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-[#1a2b4e] text-white px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-bold tracking-tight">{plan.program.name}</h1>
          <p className="text-sm text-blue-200 mt-0.5">{plan.title} · Schedule</p>
        </div>
      </header>
      <ExportView sections={sections} creditMap={creditMap} />
    </main>
  );
}
