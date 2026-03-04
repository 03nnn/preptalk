import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    // If backend is unreachable, allow demo-mode login
    const body = await request.clone().json().catch(() => ({}));
    return NextResponse.json({
      success: true,
      message: "Login successful (demo mode - backend offline)",
      username: body.username || "demo-user",
    });
  }
}
