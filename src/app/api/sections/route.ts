import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const codes = request.nextUrl.searchParams.get("codes");
  const courseCodes = codes ? [...new Set(codes.split(",").filter(Boolean))] : [];

  if (courseCodes.length === 0) return NextResponse.json([]);

  const sections = await db.section.findMany({
    where: { courseCode: { in: courseCodes } },
    orderBy: [{ courseCode: "asc" }, { crn: "asc" }],
  });

  return NextResponse.json(sections);
}
