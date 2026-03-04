import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category   = searchParams.get("category")   || "behavioral";
  const jobDomain  = searchParams.get("jobDomain")  || "Software Engineer";
  const difficulty = searchParams.get("difficulty") || "Medium";

  try {
    const params = new URLSearchParams({ category, jobDomain, difficulty });
    const res = await fetch(`${BACKEND_URL}/question?${params}`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`Backend /question returned ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.warn("[question API] Backend call failed:", err instanceof Error ? err.message : err);
    // Last-resort static fallback
    return NextResponse.json({
      question: "Tell me about yourself and your background.",
      source: "static-fallback",
    });
  }
}