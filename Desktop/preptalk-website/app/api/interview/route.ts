import { type NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// Mock data for interview questions
const QUESTIONS = {
  hr: [
    "Tell me about yourself and your background.",
    "Why do you want to work for our company?",
    "Where do you see yourself in 5 years?",
    "What are your strengths and weaknesses?",
    "Describe a challenging situation at work and how you handled it.",
  ],
  technical: [
    "Explain your approach to problem-solving in your field.",
    "Describe a project where you applied your technical skills effectively.",
    "How do you stay updated with the latest technologies in your field?",
    "Explain a complex technical concept in simple terms.",
    "How would you handle a technical disagreement with a team member?",
  ],
  behavioral: [
    "Describe a time when you had to work under pressure to meet a deadline.",
    "Tell me about a time when you had to adapt to a significant change at work.",
    "Give an example of how you worked on a team to accomplish a goal.",
    "Describe a situation where you had to resolve a conflict with a colleague.",
    "Tell me about a time when you failed and what you learned from it.",
  ],
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const category = searchParams.get("category") || "hr"

  // Validate category
  if (!["hr", "technical", "behavioral"].includes(category)) {
    return NextResponse.json({ error: "Invalid category. Must be one of: hr, technical, behavioral" }, { status: 400 })
  }

  // Get random question from the category
  const questions = QUESTIONS[category as keyof typeof QUESTIONS]
  const randomIndex = Math.floor(Math.random() * questions.length)
  const question = questions[randomIndex]

  return NextResponse.json({ question, category })
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const audio = formData.get("audio") as File

  // Forward audio to Python backend
  const pyRes = await fetch(`${BACKEND_URL}/transcribe`, {
    method: "POST",
    body: formData,
  })
  const data = await pyRes.json()
  // Optionally save transcript in session/db here
  return NextResponse.json({ transcript: data.transcript })
}
