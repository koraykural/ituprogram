"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Program = { code: string; name: string };
type Faculty = { id: number; name: string; programs: Program[] };
type CoursePlan = { id: number; title: string };

export default function PlanSelector({ faculties }: { faculties: Faculty[] }) {
  const router = useRouter();
  const [facultyId, setFacultyId] = useState<number | null>(null);
  const [programCode, setProgramCode] = useState<string | null>(null);
  const [plans, setPlans] = useState<CoursePlan[] | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const selectedFaculty = faculties.find((f) => f.id === facultyId) ?? null;

  function handleFacultyChange(id: number) {
    setFacultyId(id);
    setProgramCode(null);
    setPlans(null);
  }

  async function handleProgramChange(code: string) {
    setProgramCode(code);
    setPlans(null);
    setLoadingPlans(true);
    try {
      const res = await fetch(`/api/programs/${code}/plans`);
      const data: CoursePlan[] = await res.json();
      setPlans(data);
    } finally {
      setLoadingPlans(false);
    }
  }

  function handlePlanChange(id: string) {
    if (id) router.push(`/plan/${id}`);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
      <h2 className="font-semibold text-gray-800">Find Your Course Plan</h2>

      {/* Faculty */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
          Faculty
        </label>
        <select
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
          value={facultyId ?? ""}
          onChange={(e) => handleFacultyChange(Number(e.target.value))}
        >
          <option value="" disabled>Select a faculty</option>
          {faculties.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      {/* Program */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
          Program
        </label>
        <select
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
          value={programCode ?? ""}
          disabled={!selectedFaculty}
          onChange={(e) => handleProgramChange(e.target.value)}
        >
          <option value="" disabled>
            {selectedFaculty ? "Select a program" : "Select a faculty first"}
          </option>
          {selectedFaculty?.programs.map((p) => (
            <option key={p.code} value={p.code}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Course Plan */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
          Course Plan
        </label>
        <select
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
          defaultValue=""
          disabled={!plans || plans.length === 0}
          onChange={(e) => handlePlanChange(e.target.value)}
        >
          <option value="" disabled>
            {!programCode
              ? "Select a program first"
              : loadingPlans
              ? "Loading..."
              : plans?.length === 0
              ? "No plans found"
              : "Select a course plan"}
          </option>
          {plans?.map((plan) => (
            <option key={plan.id} value={plan.id}>{plan.title}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
