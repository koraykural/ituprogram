import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import PlanView from "@/components/PlanView";

export default async function PlanDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ codes?: string; custom?: string }>;
}) {
  const { id } = await params;
  const { codes, custom } = await searchParams;

  const decodeCode = (c: string) => c.replace(/_/g, " ");
  const initialCodes = codes ? codes.split(",").filter(Boolean).map(decodeCode) : [];
  const customCodes = custom ? custom.split(",").filter(Boolean).map(decodeCode) : [];

  const [plan, initialCustom] = await Promise.all([
    db.coursePlan.findUnique({
      where: { id: Number(id) },
      include: {
        program: { include: { faculty: true } },
        semesters: {
          orderBy: { number: "asc" },
          include: {
            entries: { orderBy: { id: "asc" } },
            electiveGroups: {
              orderBy: { id: "asc" },
              include: { entries: { orderBy: { courseCode: "asc" } } },
            },
          },
        },
      },
    }),
    customCodes.length > 0
      ? db.uniquePlanEntry.findMany({
          where: { courseCode: { in: customCodes } },
          select: { courseCode: true, courseTitle: true, credit: true, ects: true },
        })
      : [],
  ]);

  if (!plan) notFound();

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-[#1a2b4e] text-white px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-bold tracking-tight">{plan.program.name}</h1>
          <p className="text-sm text-blue-200 mt-0.5">{plan.title}</p>
        </div>
      </header>

      <PlanView
        plan={plan}
        initialCodes={initialCodes}
        initialCustom={initialCustom}
      />
    </main>
  );
}
