"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { loadCrns } from "@/lib/plan-session";

// ── Types ─────────────────────────────────────────────────────────────────────

type PlanEntry = {
  id: number;
  courseCode: string;
  courseTitle: string;
  language: string | null;
  credit: number | null;
  ects: number | null;
};

type EgEntry = {
  id: number;
  courseCode: string;
  courseTitle: string;
  language: string | null;
  credit: number | null;
  ects: number | null;
};

type ElectiveGroup = {
  id: number;
  name: string;
  credit: number | null;
  entries: EgEntry[];
};

type Semester = {
  id: number;
  number: number;
  entries: PlanEntry[];
  electiveGroups: ElectiveGroup[];
};

type Plan = {
  id: number;
  title: string;
  program: { name: string };
  semesters: Semester[];
};

type CustomCourse = {
  courseCode: string;
  courseTitle: string;
  credit: number | null;
  ects: number | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function IndeterminateCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
    />
  );
}

// ── Elective group: collapsible section inside a semester table ───────────────

function ElectiveGroupSection({
  group,
  selectedCodes,
  onToggle,
  onToggleAll,
}: {
  group: ElectiveGroup;
  selectedCodes: Set<string>;
  onToggle: (code: string) => void;
  onToggleAll: (codes: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const codes = group.entries.map((e) => e.courseCode);
  const allChecked = codes.length > 0 && codes.every((c) => selectedCodes.has(c));

  return (
    <>
      <tr
        className="bg-amber-50 hover:bg-amber-100 cursor-pointer transition-colors select-none"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="px-4 py-2.5 w-10 text-amber-400">
          <svg
            className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-90" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </td>
        <td
          colSpan={5}
          className="py-2.5 pr-4 text-xs font-semibold text-amber-700"
        >
          <div className="flex items-center gap-2">
            {group.name}
            <span className="font-normal text-amber-500">
              ({group.entries.length} options)
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleAll(codes); }}
              className="ml-1 font-normal text-amber-600 hover:text-amber-800 underline transition-colors"
            >
              {allChecked ? "Deselect all" : "Select all"}
            </button>
          </div>
        </td>
      </tr>

      {open &&
        group.entries.map((entry) => (
          <tr
            key={entry.id}
            className="hover:bg-amber-50 transition-colors cursor-pointer bg-white"
            onClick={() => onToggle(entry.courseCode)}
          >
            <td className="px-4 py-2.5 w-10">
              <input
                type="checkbox"
                checked={selectedCodes.has(entry.courseCode)}
                onChange={() => onToggle(entry.courseCode)}
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 rounded border-gray-300 text-amber-600 cursor-pointer"
              />
            </td>
            <td className="pl-8 pr-4 py-2.5 font-mono text-xs text-amber-700 w-28">
              {entry.courseCode}
            </td>
            <td className="px-4 py-2.5 text-gray-700 text-sm">
              {entry.courseTitle}
            </td>
            <td className="px-4 py-2.5 text-gray-500 text-sm hidden sm:table-cell">
              {entry.language ?? "—"}
            </td>
            <td className="px-4 py-2.5 text-center text-gray-700 text-sm hidden sm:table-cell">
              {entry.credit ?? "—"}
            </td>
            <td className="px-4 py-2.5 text-center text-gray-700 text-sm hidden sm:table-cell">
              {entry.ects ?? "—"}
            </td>
          </tr>
        ))}
    </>
  );
}

// ── Semester card ─────────────────────────────────────────────────────────────

function SemesterCard({
  semester,
  selectedCodes,
  onToggle,
  onToggleAll,
}: {
  semester: Semester;
  selectedCodes: Set<string>;
  onToggle: (code: string) => void;
  onToggleAll: (codes: string[]) => void;
}) {
  const { entries, electiveGroups } = semester;
  const allChecked =
    entries.length > 0 && entries.every((e) => selectedCodes.has(e.courseCode));
  const someChecked = entries.some((e) => selectedCodes.has(e.courseCode));

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-semibold text-sm text-gray-700">
          Semester {semester.number}
        </h2>
        <span className="text-xs text-gray-400">
          {entries.length} compulsory
          {electiveGroups.length > 0 &&
            ` · ${electiveGroups.length} elective group${electiveGroups.length > 1 ? "s" : ""}`}
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
            <th className="px-4 py-2 w-10">
              {entries.length > 0 && (
                <IndeterminateCheckbox
                  checked={allChecked}
                  indeterminate={someChecked && !allChecked}
                  onChange={() => onToggleAll(entries.map((e) => e.courseCode))}
                />
              )}
            </th>
            <th className="px-4 py-2 font-medium w-28">Code</th>
            <th className="px-4 py-2 font-medium">Title</th>
            <th className="px-4 py-2 font-medium hidden sm:table-cell">Lang</th>
            <th className="px-4 py-2 font-medium text-center hidden sm:table-cell">
              Credits
            </th>
            <th className="px-4 py-2 font-medium text-center hidden sm:table-cell">
              ECTS
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {entries.map((entry) => (
            <tr
              key={entry.id}
              className="hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => onToggle(entry.courseCode)}
            >
              <td className="px-4 py-2.5 w-10">
                <input
                  type="checkbox"
                  checked={selectedCodes.has(entry.courseCode)}
                  onChange={() => onToggle(entry.courseCode)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                />
              </td>
              <td className="px-4 py-2.5 text-gray-800 text-sm w-28">
                {entry.courseCode}
              </td>
              <td className="px-4 py-2.5 text-gray-800 text-sm">
                {entry.courseTitle}
              </td>
              <td className="px-4 py-2.5 text-gray-500 text-sm hidden sm:table-cell">
                {entry.language ?? "—"}
              </td>
              <td className="px-4 py-2.5 text-center text-gray-700 text-sm hidden sm:table-cell">
                {entry.credit ?? "—"}
              </td>
              <td className="px-4 py-2.5 text-center text-gray-700 text-sm hidden sm:table-cell">
                {entry.ects ?? "—"}
              </td>
            </tr>
          ))}
          {electiveGroups.map((group) => (
            <ElectiveGroupSection
              key={group.id}
              group={group}
              selectedCodes={selectedCodes}
              onToggle={onToggle}
              onToggleAll={onToggleAll}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Custom course selector ────────────────────────────────────────────────────

function CustomCourseSelector({
  added,
  selectedCodes,
  onAdd,
  onRemove,
  onToggle,
}: {
  added: CustomCourse[];
  selectedCodes: Set<string>;
  onAdd: (course: CustomCourse) => void;
  onRemove: (code: string) => void;
  onToggle: (code: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomCourse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    fetch(`/api/courses/search?q=${encodeURIComponent(q)}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        setResults(data);
        setLoading(false);
      })
      .catch(() => {});

    return () => controller.abort();
  }, [query]);

  const addedCodes = new Set(added.map((c) => c.courseCode));
  const shownResults = results.filter((r) => !addedCodes.has(r.courseCode));

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
        <h2 className="font-semibold text-sm text-gray-700">
          Additional Courses
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Search and add courses outside your plan
        </p>
      </div>

      <div className="p-4 space-y-3">
        <input
          type="text"
          placeholder="Search by code or title…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {(shownResults.length > 0 || loading) && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {loading && shownResults.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">Searching…</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-2 font-medium w-28">Code</th>
                    <th className="px-4 py-2 font-medium">Title</th>
                    <th className="px-4 py-2 font-medium text-center hidden sm:table-cell">
                      Credits
                    </th>
                    <th className="px-4 py-2 font-medium text-center hidden sm:table-cell">
                      ECTS
                    </th>
                    <th className="px-4 py-2 w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {shownResults.map((course) => (
                    <tr key={course.courseCode} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-mono text-xs text-blue-700">
                        {course.courseCode}
                      </td>
                      <td className="px-4 py-2.5 text-gray-800 text-sm">
                        {course.courseTitle}
                      </td>
                      <td className="px-4 py-2.5 text-center text-gray-600 text-sm hidden sm:table-cell">
                        {course.credit ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-center text-gray-600 text-sm hidden sm:table-cell">
                        {course.ects ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => onAdd(course)}
                          className="text-xs px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        >
                          Add
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {added.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Added ({added.length})
              </span>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {added.map((course) => (
                  <tr
                    key={course.courseCode}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => onToggle(course.courseCode)}
                  >
                    <td className="px-4 py-2.5 w-10">
                      <input
                        type="checkbox"
                        checked={selectedCodes.has(course.courseCode)}
                        onChange={() => onToggle(course.courseCode)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-blue-700 w-28">
                      {course.courseCode}
                    </td>
                    <td className="px-4 py-2.5 text-gray-800 text-sm">
                      {course.courseTitle}
                    </td>
                    <td className="px-4 py-2.5 text-center text-gray-600 text-sm hidden sm:table-cell">
                      {course.credit ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-center text-gray-600 text-sm hidden sm:table-cell">
                      {course.ects ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 w-10 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(course.courseCode);
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors text-xs"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const encodeCode = (code: string) => code.replace(/ /g, "_");

export default function PlanView({
  plan,
  initialCodes,
  initialCustom,
}: {
  plan: Plan;
  initialCodes: string[];
  initialCustom: CustomCourse[];
}) {
  const router = useRouter();
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(
    new Set(initialCodes),
  );
  const [customAdded, setCustomAdded] = useState<CustomCourse[]>(initialCustom);

  // Sync to URL without adding history entries
  useEffect(() => {
    const parts: string[] = [];
    const codesStr = Array.from(selectedCodes).map(encodeCode).join(",");
    const customStr = customAdded.map((c) => encodeCode(c.courseCode)).join(",");
    if (codesStr) parts.push(`codes=${codesStr}`);
    if (customStr) parts.push(`custom=${customStr}`);
    const search = parts.length > 0 ? `?${parts.join("&")}` : "";
    window.history.replaceState(null, "", window.location.pathname + search);
  }, [selectedCodes, customAdded]);

  // Credit total: sum credits of unique selected codes (first occurrence wins)
  const creditByCode = new Map<string, number>();
  for (const sem of plan.semesters) {
    for (const e of sem.entries) {
      if (!creditByCode.has(e.courseCode) && e.credit != null)
        creditByCode.set(e.courseCode, e.credit);
    }
    for (const g of sem.electiveGroups) {
      for (const e of g.entries) {
        if (!creditByCode.has(e.courseCode) && e.credit != null)
          creditByCode.set(e.courseCode, e.credit);
      }
    }
  }
  for (const c of customAdded) {
    if (!creditByCode.has(c.courseCode) && c.credit != null)
      creditByCode.set(c.courseCode, c.credit);
  }

  const totalCredits = Array.from(selectedCodes).reduce(
    (sum, code) => sum + (creditByCode.get(code) ?? 0),
    0,
  );

  function toggle(code: string) {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }

  function toggleAll(codes: string[]) {
    const allChecked = codes.every((c) => selectedCodes.has(c));
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      allChecked
        ? codes.forEach((c) => next.delete(c))
        : codes.forEach((c) => next.add(c));
      return next;
    });
  }

  function addCustom(course: CustomCourse) {
    setCustomAdded((prev) =>
      prev.some((c) => c.courseCode === course.courseCode)
        ? prev
        : [...prev, course],
    );
  }

  function removeCustom(code: string) {
    setCustomAdded((prev) => prev.filter((c) => c.courseCode !== code));
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      next.delete(code);
      return next;
    });
  }

  function handleNext() {
    const parts: string[] = [];
    const codesStr = Array.from(selectedCodes).map(encodeCode).join(",");
    const customStr = customAdded.map((c) => encodeCode(c.courseCode)).join(",");
    if (codesStr) parts.push(`codes=${codesStr}`);
    if (customStr) parts.push(`custom=${customStr}`);
    // Restore any CRNs the user had selected before coming back to this page
    const savedCrns = loadCrns(plan.id);
    if (savedCrns.length) parts.push(`crns=${savedCrns.join(",")}`);
    router.push(`/schedule/${plan.id}?${parts.join("&")}`);
  }

  return (
    <div className="pb-24">
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-6">
        {plan.semesters.length === 0 && (
          <p className="text-gray-400 text-sm">
            Course plan details not yet scraped.
          </p>
        )}

        {plan.semesters.map((sem) => (
          <SemesterCard
            key={sem.id}
            semester={sem}
            selectedCodes={selectedCodes}
            onToggle={toggle}
            onToggleAll={toggleAll}
          />
        ))}

        <CustomCourseSelector
          added={customAdded}
          selectedCodes={selectedCodes}
          onAdd={addCustom}
          onRemove={removeCustom}
          onToggle={toggle}
        />
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">
              {selectedCodes.size}
            </span>{" "}
            courses selected
            {" · "}
            <span className="font-semibold text-gray-900">
              {totalCredits}
            </span>{" "}
            credits
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Change Plan
            </button>
            <button
              onClick={handleNext}
              disabled={selectedCodes.size === 0}
              className="px-4 py-2 text-sm rounded-lg bg-[#1a2b4e] text-white hover:bg-[#253d6e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Build Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
