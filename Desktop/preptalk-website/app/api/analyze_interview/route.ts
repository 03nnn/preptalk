import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    // Forward the multipart form data directly to the FastAPI backend
    const formData = await request.formData();
    
    const res = await fetch(`${BACKEND_URL}/analyze_interview`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Backend /analyze_interview error: ${res.status}`, errorText);
      return NextResponse.json(
        { error: `Backend error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[analyze_interview API] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to reach backend" },
      { status: 500 }
    );
  }
}
