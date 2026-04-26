import { db } from "@/lib/db";
import PlanSelector from "@/components/PlanSelector";

export default async function Home() {
  const faculties = await db.faculty.findMany({
    include: {
      programs: {
        select: { code: true, name: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-[#1a2b4e] text-white px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold tracking-tight">ITU Program</h1>
          <p className="text-sm text-blue-200 mt-0.5">Course schedule creator for ITU students</p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <PlanSelector faculties={faculties} />
      </div>
    </main>
  );
}
