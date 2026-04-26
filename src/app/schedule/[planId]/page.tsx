import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import ScheduleView from "@/components/ScheduleView";

export default async function SchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ planId: string }>;
  searchParams: Promise<{ codes?: string; custom?: string; crns?: string }>;
}) {
  const { planId } = await params;
  const { codes, custom, crns } = await searchParams;

  const decodeCode = (c: string) => c.replace(/_/g, " ");
  const selectedCodes = codes ? codes.split(",").filter(Boolean).map(decodeCode) : [];
  const customCodes = custom ? custom.split(",").filter(Boolean).map(decodeCode) : [];
  const initialCrns = crns ? crns.split(",").filter(Boolean) : [];

  const plan = await db.coursePlan.findUnique({
    where: { id: Number(planId) },
    include: { program: true },
  });
  if (!plan) notFound();

  const courseCodes = [...new Set(selectedCodes)];
  const sections = await db.section.findMany({
    where: courseCodes.length > 0 ? { courseCode: { in: courseCodes } } : undefined,
    orderBy: [{ courseCode: "asc" }, { crn: "asc" }],
  });

  // Drop CRNs that are no longer in the fetched sections
  const availableCrns = new Set(sections.map((s) => s.crn));
  const filteredInitialCrns = initialCrns.filter((crn) => availableCrns.has(crn));

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-[#1a2b4e] text-white px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-bold tracking-tight">{plan.program.name}</h1>
          <p className="text-sm text-blue-200 mt-0.5">{plan.title} · Schedule Builder</p>
        </div>
      </header>
      <ScheduleView
        sections={sections}
        planId={Number(planId)}
        selectedCodes={selectedCodes}
        customCodes={customCodes}
        initialCrns={filteredInitialCrns}
      />
    </main>
  );
}
