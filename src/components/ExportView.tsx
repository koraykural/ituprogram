"use client";

import { useMemo, Fragment, useState } from "react";

type Section = {
  crn: string;
  courseCode: string;
  courseName: string;
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
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * 2;

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

function parseTimeRange(timeStr: string): { startSlot: number; endSlot: number } | null {
  const [startStr, endStr] = timeStr.split("/");
  const parseTime = (s: string) => { const [h, m] = s.split(":").map(Number); return isNaN(h) || isNaN(m) ? null : { h, m }; };
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

// ── Color palette ─────────────────────────────────────────────────────────────

const COLORS = [
  { bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-800" },
  { bg: "bg-emerald-100", border: "border-emerald-300", text: "text-emerald-800" },
  { bg: "bg-violet-100", border: "border-violet-300", text: "text-violet-800" },
  { bg: "bg-orange-100", border: "border-orange-300", text: "text-orange-800" },
  { bg: "bg-pink-100", border: "border-pink-300", text: "text-pink-800" },
  { bg: "bg-teal-100", border: "border-teal-300", text: "text-teal-800" },
  { bg: "bg-yellow-100", border: "border-yellow-300", text: "text-yellow-800" },
  { bg: "bg-red-100", border: "border-red-300", text: "text-red-800" },
];

const SLOT_H = 20;
const TIME_COL_W = 48;
const HEADER_H = 28;

// ── Main component ────────────────────────────────────────────────────────────

export default function ExportView({ sections, creditMap }: { sections: Section[]; creditMap: Record<string, number | null> }) {
  const [copied, setCopied] = useState(false);

  function copyCrns() {
    navigator.clipboard.writeText(sections.map((s) => s.crn).join(","));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  const courseColorMap = useMemo(() => {
    const map = new Map<string, number>();
    let idx = 0;
    for (const s of sections) {
      if (!map.has(s.courseCode)) map.set(s.courseCode, idx++);
    }
    return map;
  }, [sections]);

  const calendarBlocks = useMemo(() => {
    const blocks: { crn: string; courseCode: string; instructor: string | null; day: number; startSlot: number; endSlot: number; colorIdx: number }[] = [];
    for (const section of sections) {
      const colorIdx = courseColorMap.get(section.courseCode) ?? 0;
      section.days.forEach((dayStr, i) => {
        const day = DAYS_TR[dayStr];
        if (day === undefined) return;
        const range = parseTimeRange(section.times[i]);
        if (!range) return;
        blocks.push({ crn: section.crn, courseCode: section.courseCode, instructor: section.instructor, day, ...range, colorIdx });
      });
    }
    return blocks;
  }, [sections, courseColorMap]);


  const totalH = TOTAL_SLOTS * SLOT_H;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Calendar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 overflow-x-auto select-none">
          <div className="relative" style={{ minWidth: 520 }}>
            {/* Background grid */}
            <div
              className="grid"
              style={{
                gridTemplateColumns: `${TIME_COL_W}px repeat(5, 1fr)`,
                gridTemplateRows: `${HEADER_H}px repeat(${TOTAL_SLOTS}, ${SLOT_H}px)`,
              }}
            >
              <div className="bg-gray-50 border-b border-r border-gray-200" />
              {DAY_LABELS.map((d) => (
                <div
                  key={d}
                  className="bg-gray-50 border-b border-r border-gray-200 flex items-center justify-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider"
                >
                  {d}
                </div>
              ))}
              {Array.from({ length: TOTAL_SLOTS }, (_, i) => {
                const isHourBoundary = i % 2 === 1;
                return (
                  <Fragment key={i}>
                    <div
                      className="border-r border-gray-200 flex items-start justify-end pr-1.5 pt-px text-[9px] text-gray-400"
                      style={{ borderBottom: isHourBoundary ? "1px solid #d1d5db" : "1px solid #f3f4f6" }}
                    >
                      {i % 2 === 0 ? slotToLabel(i) : ""}
                    </div>
                    {Array.from({ length: 5 }, (_, d) => (
                      <div
                        key={d}
                        className="border-r border-gray-100"
                        style={{ borderBottom: isHourBoundary ? "1px solid #d1d5db" : "1px solid #f3f4f6" }}
                      />
                    ))}
                  </Fragment>
                );
              })}
            </div>

            {/* Block overlay */}
            <div className="absolute pointer-events-none" style={{ top: HEADER_H, left: TIME_COL_W, right: 0, height: totalH }}>
              {calendarBlocks.map((block) => {
                const color = COLORS[block.colorIdx % COLORS.length];
                const colPct = 100 / 5;
                return (
                  <div
                    key={`${block.crn}-${block.day}`}
                    className={`absolute rounded border ${color.bg} ${color.border} ${color.text} overflow-hidden`}
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
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Combined table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-sm text-gray-700">
            Courses <span className="font-normal text-gray-400">({sections.length})</span>
          </h2>
          <button
            onClick={copyCrns}
            className="text-xs px-2.5 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {copied ? "Copied!" : "Copy CRNs"}
          </button>
        </div>
        <div className="overflow-x-auto"><table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
              <th className="px-4 py-2 font-medium">Code</th>
              <th className="px-4 py-2 font-medium">Title</th>
              <th className="px-4 py-2 font-medium text-center">Credits</th>
              <th className="px-4 py-2 font-medium">CRN</th>
              <th className="px-4 py-2 font-medium">Instructor</th>
              <th className="px-4 py-2 font-medium">Days / Times</th>
              <th className="px-4 py-2 font-medium">Building</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sections.map((s) => {
              const colorIdx = courseColorMap.get(s.courseCode) ?? 0;
              const color = COLORS[colorIdx % COLORS.length];
              const credit = creditMap[s.courseCode];
              const slots = s.days.map((d, i) => ({ day: DAY_ABBR[d] ?? d, time: s.times[i] ?? "" }));
              const buildings = [...new Set(s.buildings.filter(Boolean))];
              return (
                <tr key={s.crn}>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold ${color.bg} ${color.text}`}>
                      {s.courseCode}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700 text-sm">{s.courseName}</td>
                  <td className="px-4 py-2.5 text-center text-gray-500 text-sm">{credit ?? "—"}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{s.crn}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{s.instructor ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">
                    {slots.map((sl, i) => <div key={i}>{sl.day} {sl.time}</div>)}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">
                    {buildings.length ? buildings.map((b, i) => <div key={i}>{b}</div>) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
