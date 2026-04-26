"use client";

import { useState, useMemo, useEffect, Fragment } from "react";
import { useRouter } from "next/navigation";
import { saveCrns } from "@/lib/plan-session";

type Section = {
  crn: string;
  courseCode: string;
  courseName: string;
  teachingMethod: string | null;
  instructor: string | null;
  buildings: string[];
  days: string[];
  times: string[];
  rooms: string[];
  capacity: number;
  enrolled: number;
  majorRestrictions: string[];
};

// ── Time / day helpers ────────────────────────────────────────────────────────

const START_HOUR = 8;
const END_HOUR = 18;
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * 2; // 20 half-hour slots

const DAYS_TR: Record<string, number> = {
  Pazartesi: 0,
  Salı: 1,
  Çarşamba: 2,
  Perşembe: 3,
  Cuma: 4,
};

const DAY_ABBR: Record<string, string> = {
  Pazartesi: "Pzt",
  Salı: "Sal",
  Çarşamba: "Car",
  Perşembe: "Per",
  Cuma: "Cum",
};
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function parseTime(s: string): { h: number; m: number } | null {
  const [h, m] = s.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return { h, m };
}

/** Converts "HH:MM/HH:MM" → { startSlot, endSlot } (0-based from START_HOUR) */
function parseTimeRange(timeStr: string): { startSlot: number; endSlot: number } | null {
  const [startStr, endStr] = timeStr.split("/");
  const start = parseTime(startStr);
  const end = parseTime(endStr);
  if (!start || !end) return null;
  const startSlot = (start.h - START_HOUR) * 2 + Math.floor(start.m / 30);
  const endSlot = (end.h - START_HOUR) * 2 + Math.ceil(end.m / 30);
  if (startSlot < 0 || endSlot > TOTAL_SLOTS || startSlot >= endSlot) return null;
  return { startSlot, endSlot };
}

function slotToLabel(slot: number): string {
  const h = START_HOUR + Math.floor(slot / 2);
  const m = slot % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
}

function earliestSlot(section: Section): number {
  let min = Infinity;
  for (let i = 0; i < section.days.length; i++) {
    const day = DAYS_TR[section.days[i]];
    if (day === undefined) continue;
    const range = parseTimeRange(section.times[i]);
    if (!range) continue;
    const val = day * TOTAL_SLOTS + range.startSlot;
    if (val < min) min = val;
  }
  return min === Infinity ? 9999 : min;
}

// ── Color palette ─────────────────────────────────────────────────────────────

const COLORS = [
  { bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-800", light: "bg-blue-50" },
  { bg: "bg-emerald-100", border: "border-emerald-300", text: "text-emerald-800", light: "bg-emerald-50" },
  { bg: "bg-violet-100", border: "border-violet-300", text: "text-violet-800", light: "bg-violet-50" },
  { bg: "bg-orange-100", border: "border-orange-300", text: "text-orange-800", light: "bg-orange-50" },
  { bg: "bg-pink-100", border: "border-pink-300", text: "text-pink-800", light: "bg-pink-50" },
  { bg: "bg-teal-100", border: "border-teal-300", text: "text-teal-800", light: "bg-teal-50" },
  { bg: "bg-yellow-100", border: "border-yellow-300", text: "text-yellow-800", light: "bg-yellow-50" },
  { bg: "bg-red-100", border: "border-red-300", text: "text-red-800", light: "bg-red-50" },
];

// ── Calendar ──────────────────────────────────────────────────────────────────

type CalendarBlock = {
  crn: string;
  courseCode: string;
  courseName: string;
  instructor: string | null;
  day: number;      // 0=Mon … 4=Fri
  startSlot: number;
  endSlot: number;
  colorIdx: number;
};

const SLOT_H = 20; // px per 30-min slot → 40px/hr, compact
const TIME_COL_W = 48;
const HEADER_H = 28;

function WeeklyCalendar({
  blocks,
  onRemove,
}: {
  blocks: CalendarBlock[];
  onRemove: (crn: string) => void;
}) {
  const totalH = TOTAL_SLOTS * SLOT_H;

  return (
    <div className="overflow-x-auto select-none">
      {/* relative wrapper so the block overlay can be positioned against it */}
      <div className="relative" style={{ minWidth: 520 }}>

        {/* ── Background grid (borders + labels) ── */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: `${TIME_COL_W}px repeat(5, 1fr)`,
            gridTemplateRows: `${HEADER_H}px repeat(${TOTAL_SLOTS}, ${SLOT_H}px)`,
          }}
        >
          {/* Header row */}
          <div className="bg-gray-50 border-b border-r border-gray-200" />
          {DAY_LABELS.map((d) => (
            <div
              key={d}
              className="bg-gray-50 border-b border-r border-gray-200 flex items-center justify-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider"
            >
              {d}
            </div>
          ))}

          {/* Slot rows */}
          {Array.from({ length: TOTAL_SLOTS }, (_, i) => {
            // Draw the hour line at the BOTTOM of odd slots:
            // slot 1 bottom = 9:00, slot 3 bottom = 10:00, etc.
            const isHourBoundary = i % 2 === 1;
            return (
              <Fragment key={i}>
                <div
                  className="border-r border-gray-200 flex items-start justify-end pr-1.5 pt-px text-[9px] text-gray-400"
                  style={{
                    borderBottom: isHourBoundary ? "1px solid #d1d5db" : "1px solid #f3f4f6",
                  }}
                >
                  {/* Label on even slots, positioned at the top = the hour mark */}
                  {i % 2 === 0 ? slotToLabel(i) : ""}
                </div>
                {Array.from({ length: 5 }, (_, d) => (
                  <div
                    key={d}
                    className="border-r border-gray-100"
                    style={{
                      borderBottom: isHourBoundary ? "1px solid #d1d5db" : "1px solid #f3f4f6",
                    }}
                  />
                ))}
              </Fragment>
            );
          })}
        </div>

        {/* ── Block overlay (absolutely positioned, offset past time col + header) ── */}
        <div
          className="absolute pointer-events-none"
          style={{ top: HEADER_H, left: TIME_COL_W, right: 0, height: totalH }}
        >
          {blocks.map((block) => {
            const color = COLORS[block.colorIdx % COLORS.length];
            const colPct = 100 / 5;
            return (
              <div
                key={`${block.crn}-${block.day}`}
                className={`group/block pointer-events-auto absolute rounded border ${color.bg} ${color.border} ${color.text} overflow-hidden transition-colors`}
                style={{
                  top: block.startSlot * SLOT_H + 1,
                  left: `calc(${block.day * colPct}% + 1px)`,
                  width: `calc(${colPct}% - 2px)`,
                  height: (block.endSlot - block.startSlot) * SLOT_H - 2,
                }}
              >
                <div className="px-1 py-px">
                  <p className="text-[9px] font-bold leading-tight truncate">{block.courseCode}</p>
                  <p className="text-[8px] leading-tight truncate opacity-60 font-mono">{block.crn}</p>
                  {(block.endSlot - block.startSlot) >= 3 && (
                    <p className="text-[8px] leading-tight truncate opacity-75">{block.instructor ?? ""}</p>
                  )}
                </div>
                {/* Remove button — large hit area, small visual dot */}
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(block.crn); }}
                  className="absolute top-0 right-0 w-6 h-6 flex items-start justify-end p-0.5 opacity-0 group-hover/block:opacity-100 transition-opacity cursor-pointer"
                >
                  <span className="w-3.5 h-3.5 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shrink-0">
                    <span className="text-white font-bold leading-none" style={{ fontSize: 9 }}>✕</span>
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Sections list ─────────────────────────────────────────────────────────────

function SectionRow({
  section,
  selected,
  alternative,
  conflict,
  colorIdx,
  onToggle,
}: {
  section: Section;
  selected: boolean;
  alternative: boolean; // same course already in calendar
  conflict: boolean;    // time collision with a selected section
  colorIdx: number | null;
  onToggle: () => void;
}) {
  const color = colorIdx !== null ? COLORS[colorIdx % COLORS.length] : null;
  const blocked = alternative || conflict;
  const slots = section.days.map((d, i) => ({
    day: DAY_ABBR[d] ?? d.slice(0, 3),
    time: section.times[i] ?? "",
    building: section.buildings[i] ?? "",
  }));
  const uniqueBuildings = [...new Set(slots.map((s) => s.building).filter(Boolean))];

  const rowClass = selected
    ? `cursor-pointer ${color ? color.light : "bg-blue-50"}`
    : conflict
    ? "opacity-50 bg-red-50 cursor-not-allowed"
    : alternative
    ? "opacity-40 cursor-not-allowed"
    : "cursor-pointer hover:bg-gray-50";

  return (
    <tr className={`transition-colors ${rowClass}`} onClick={blocked ? undefined : onToggle}>
      <td className="px-4 py-2.5 w-10">
        <input
          type="checkbox"
          checked={selected}
          disabled={blocked}
          onChange={blocked ? undefined : onToggle}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 disabled:cursor-not-allowed"
        />
      </td>
      <td className="px-4 py-2.5 font-mono text-xs text-gray-500 w-24">{section.crn}</td>
      <td className="px-4 py-2.5 font-mono text-xs text-blue-700 w-28">{section.courseCode}</td>
      <td className="px-4 py-2.5 text-sm text-gray-800 max-w-xs truncate">{section.courseName}</td>
      <td className="px-4 py-2.5 text-sm text-gray-600 hidden md:table-cell">
        {section.instructor ?? "—"}
      </td>
      <td className="px-4 py-2.5 text-xs text-gray-500 hidden lg:table-cell">
        {slots.length === 0 ? "—" : slots.map((s, i) => (
          <div key={i}>{s.day} {s.time}</div>
        ))}
      </td>
      <td className="px-4 py-2.5 text-xs text-gray-500 hidden lg:table-cell">
        {uniqueBuildings.length === 0 ? "—" : uniqueBuildings.map((b, i) => (
          <div key={i}>{b}</div>
        ))}
      </td>
      <td className="px-4 py-2.5 text-xs text-center text-gray-500 hidden sm:table-cell">
        {section.enrolled}/{section.capacity}
      </td>
    </tr>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const encodeCode = (c: string) => c.replace(/ /g, "_");

export default function ScheduleView({
  sections,
  planId,
  selectedCodes,
  customCodes,
  initialCrns = [],
}: {
  sections: Section[];
  planId: number;
  selectedCodes: string[];
  customCodes: string[];
  initialCrns?: string[];
}) {
  const router = useRouter();
  const [selectedCrns, setSelectedCrns] = useState<Set<string>>(new Set(initialCrns));
  const [search, setSearch] = useState("");

  // Sync selectedCrns → URL without adding history entries
  useEffect(() => {
    const parts: string[] = [];
    const codesStr = selectedCodes.map(encodeCode).join(",");
    const customStr = customCodes.map(encodeCode).join(",");
    const crnsStr = [...selectedCrns].join(",");
    if (codesStr) parts.push(`codes=${codesStr}`);
    if (customStr) parts.push(`custom=${customStr}`);
    if (crnsStr) parts.push(`crns=${crnsStr}`);
    const qs = parts.length > 0 ? `?${parts.join("&")}` : "";
    window.history.replaceState(null, "", window.location.pathname + qs);
  }, [selectedCrns, selectedCodes, customCodes]);

  // Assign a stable color index per unique courseCode
  const courseColorMap = useMemo(() => {
    const map = new Map<string, number>();
    let idx = 0;
    for (const s of sections) {
      if (!map.has(s.courseCode)) map.set(s.courseCode, idx++);
    }
    return map;
  }, [sections]);

  // Build calendar blocks from selected sections
  const calendarBlocks = useMemo<CalendarBlock[]>(() => {
    const blocks: CalendarBlock[] = [];
    for (const section of sections) {
      if (!selectedCrns.has(section.crn)) continue;
      const colorIdx = courseColorMap.get(section.courseCode) ?? 0;
      section.days.forEach((dayStr, i) => {
        const day = DAYS_TR[dayStr];
        if (day === undefined) return;
        const timeStr = section.times[i];
        if (!timeStr) return;
        const range = parseTimeRange(timeStr);
        if (!range) return;
        blocks.push({
          crn: section.crn,
          courseCode: section.courseCode,
          courseName: section.courseName,
          instructor: section.instructor,
          day,
          startSlot: range.startSlot,
          endSlot: range.endSlot,
          colorIdx,
        });
      });
    }
    return blocks;
  }, [sections, selectedCrns, courseColorMap]);

  // Count sections per course code to sort by rarity (fewest sections first)
  const sectionCountByCode = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sections) map.set(s.courseCode, (map.get(s.courseCode) ?? 0) + 1);
    return map;
  }, [sections]);

  const selectedCourseCodes = useMemo(
    () => new Set(sections.filter((s) => selectedCrns.has(s.crn)).map((s) => s.courseCode)).size,
    [sections, selectedCrns]
  );

  // Compute two separate blocked sets:
  // - alternativeCrns: same course code as a selected section (user already picked one)
  // - conflictCrns: time collision with a selected section
  const { alternativeCrns, conflictCrns } = useMemo(() => {
    const selected = sections.filter((s) => selectedCrns.has(s.crn));
    const selectedCourseCodes = new Set(selected.map((s) => s.courseCode));

    type Slot = { day: number; startSlot: number; endSlot: number };
    const occupiedSlots: Slot[] = [];
    for (const s of selected) {
      s.days.forEach((dayStr, i) => {
        const day = DAYS_TR[dayStr];
        if (day === undefined) return;
        const range = parseTimeRange(s.times[i]);
        if (range) occupiedSlots.push({ day, ...range });
      });
    }

    const alternatives = new Set<string>();
    const conflicts = new Set<string>();
    for (const s of sections) {
      if (selectedCrns.has(s.crn)) continue;

      if (selectedCourseCodes.has(s.courseCode)) {
        alternatives.add(s.crn);
        continue;
      }

      outer: for (const occupied of occupiedSlots) {
        for (let i = 0; i < s.days.length; i++) {
          const day = DAYS_TR[s.days[i]];
          if (day !== occupied.day) continue;
          const range = parseTimeRange(s.times[i]);
          if (!range) continue;
          if (range.startSlot < occupied.endSlot && range.endSlot > occupied.startSlot) {
            conflicts.add(s.crn);
            break outer;
          }
        }
      }
    }
    return { alternativeCrns: alternatives, conflictCrns: conflicts };
  }, [sections, selectedCrns]);

  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? sections.filter(
          (s) =>
            s.courseCode.toLowerCase().includes(q) ||
            s.courseName.toLowerCase().includes(q) ||
            s.crn.includes(q) ||
            (s.instructor ?? "").toLowerCase().includes(q)
        )
      : [...sections];
    // Sort: selected → available → conflicts → alternatives
    const rank = (crn: string) =>
      selectedCrns.has(crn) ? 0 : conflictCrns.has(crn) ? 2 : alternativeCrns.has(crn) ? 3 : 1;
    list.sort((a, b) => {
      const rankDiff = rank(a.crn) - rank(b.crn);
      if (rankDiff !== 0) return rankDiff;
      const diff = (sectionCountByCode.get(a.courseCode) ?? 0) - (sectionCountByCode.get(b.courseCode) ?? 0);
      if (diff !== 0) return diff;
      if (a.courseCode !== b.courseCode) return a.courseCode < b.courseCode ? -1 : 1;
      return earliestSlot(a) - earliestSlot(b);
    });
    return list;
  }, [sections, search, sectionCountByCode, selectedCrns, alternativeCrns, conflictCrns]);

  function toggleSection(crn: string) {
    setSelectedCrns((prev) => {
      const next = new Set(prev);
      next.has(crn) ? next.delete(crn) : next.add(crn);
      return next;
    });
  }

  function handlePrevious() {
    saveCrns(planId, [...selectedCrns]);
    const parts: string[] = [];
    const codesStr = selectedCodes.map(encodeCode).join(",");
    const customStr = customCodes.map(encodeCode).join(",");
    if (codesStr) parts.push(`codes=${codesStr}`);
    if (customStr) parts.push(`custom=${customStr}`);
    router.push(`/plan/${planId}?${parts.join("&")}`);
  }

  function handleExport() {
    const crnsStr = [...selectedCrns].join(",");
    router.push(`/schedule/${planId}/export${crnsStr ? `?crns=${crnsStr}` : ""}`);
  }

  return (
    <div className="pb-24">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Calendar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4">
            <WeeklyCalendar
              blocks={calendarBlocks}
              onRemove={(crn) => toggleSection(crn)}
            />
          </div>
        </div>

        {/* Sections list */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-4">
            <h2 className="font-semibold text-sm text-gray-700 shrink-0">
              Open Sections{" "}
              <span className="font-normal text-gray-400">({sections.length})</span>
            </h2>
            <input
              type="text"
              placeholder="Search by code, name, CRN or instructor…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {sections.length === 0 ? (
            <p className="px-6 py-8 text-sm text-gray-400">
              No open sections found for the selected courses.
            </p>
          ) : (
            <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
                    <th className="px-4 py-2 w-10" />
                    <th className="px-4 py-2 font-medium w-24">CRN</th>
                    <th className="px-4 py-2 font-medium w-28">Code</th>
                    <th className="px-4 py-2 font-medium">Course Name</th>
                    <th className="px-4 py-2 font-medium hidden md:table-cell">Instructor</th>
                    <th className="px-4 py-2 font-medium hidden lg:table-cell">Days / Times</th>
                    <th className="px-4 py-2 font-medium hidden lg:table-cell">Building</th>
                    <th className="px-4 py-2 font-medium text-center hidden sm:table-cell">Enrolled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredSections.map((section) => (
                    <SectionRow
                      key={section.crn}
                      section={section}
                      selected={selectedCrns.has(section.crn)}
                      alternative={alternativeCrns.has(section.crn)}
                      conflict={conflictCrns.has(section.crn)}
                      colorIdx={
                        selectedCrns.has(section.crn)
                          ? (courseColorMap.get(section.courseCode) ?? null)
                          : null
                      }
                      onToggle={() => toggleSection(section.crn)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{selectedCodes.length}</span> courses
            {" · "}
            <span className="font-semibold text-gray-900">{selectedCrns.size}</span> sections selected
          </p>
          <div className="flex gap-2">
            <button
              onClick={handlePrevious}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Select Courses
            </button>
            <button
              onClick={handleExport}
              disabled={selectedCrns.size === 0}
              className="px-4 py-2 text-sm rounded-lg bg-[#1a2b4e] text-white hover:bg-[#253d6e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Export Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
