import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const user_id = searchParams.get("user_id") || ""

  try {
    // Fetch real progress/analytics from backend
    const pyRes = await fetch(`${BACKEND_URL}/progress?user_id=${encodeURIComponent(user_id)}`, {
      method: "GET"
    });
    if (!pyRes.ok) {
      throw new Error(`Backend responded with status: ${pyRes.status}`);
    }
    const progress = await pyRes.json();
    return NextResponse.json(progress);
  } catch (error) {
    let message = "Unknown error";
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === "string") {
      message = error;
    }
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: `Failed to fetch progress: ${message}` },
      { status: 500 }
    );
  }
}
