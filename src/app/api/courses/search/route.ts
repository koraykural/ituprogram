import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) return NextResponse.json([]);

  const results = await db.uniquePlanEntry.findMany({
    where: {
      OR: [
        { courseCode: { contains: q, mode: "insensitive" } },
        { courseTitle: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { courseCode: true, courseTitle: true, credit: true, ects: true },
    orderBy: { courseCode: "asc" },
    take: 25,
  });

  return NextResponse.json(results);
}
