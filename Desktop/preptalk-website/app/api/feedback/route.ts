import { NextRequest, NextResponse } from "next/server"
export const runtime = 'nodejs'; 
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// Replace unsupported hyphens with ASCII
function sanitize(text: string): string {
  return text.replace(/[\u2011\u2013]/g, '-');
}

export async function POST(request: NextRequest) {
  try {
    const { conversation, user_id } = await request.json()
    
    if (!conversation) {
      return NextResponse.json(
        { error: 'No conversation provided' },
        { status: 400 }
      );
    }
    
    console.log(`Generating feedback for user ${user_id}`);
    
    // Call backend AI feedback endpoint
    const feedbackRes = await fetch(`${BACKEND_URL}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ conversation }),
    });
    if (!feedbackRes.ok) {
      throw new Error(`Backend responded with status: ${feedbackRes.status}`);
    }
    const feedback = await feedbackRes.json();

    // save the interview session 
    try {
      await fetch(`${BACKEND_URL}/save_interview`, {
         method: "POST",
         headers: { "Content-Type": "application/x-www-form-urlencoded" },
         body: new URLSearchParams({
           conversation,
           feedback: JSON.stringify(feedback),
           user_id: user_id || "",
         }),
      });
    } catch (saveErr) {
      console.warn("Failed to save interview:", saveErr);
    }

    return NextResponse.json(feedback);
    
  } catch (error) {
    let message = "Unknown error";
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === "string") {
      message = error;
    }
    console.error('Error generating feedback:', error);
    return NextResponse.json(
      { error: `Failed to generate feedback: ${message}` },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const user_id = url.searchParams.get("user_id") || "";
    const session_id = url.searchParams.get("session_id");

    // Fetch user sessions
    const res = await fetch(`${BACKEND_URL}/progress?user_id=${encodeURIComponent(user_id)}`);
    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch sessions: ${res.status}` }, { status: res.status });
    }
    const sessions = await res.json();
    const session = session_id
      ? sessions.find((s: any) => s.session_id === session_id)
      : sessions[0];
    if (!session) {
      return NextResponse.json({ error: "No sessions found. Complete a practice interview first." }, { status: 404 });
    }

    // Extract scores from session (data is now flattened by backend)
    const scores = session.scores || (session.feedback && session.feedback.scores) || {};
    const analysis = session.analysis || (session.feedback && session.feedback.analysis) || {};
    const tips = session.tips || (session.feedback && session.feedback.tips) || [];
    const strongPoints = session.strong_points || (session.feedback && session.feedback.strong_points) || [];
    const weakPoints = session.weak_points || (session.feedback && session.feedback.weak_points) || [];
    const suggestions = session.suggestions || (session.feedback && session.feedback.suggestions) || [];
    const summary = session.summary || (session.feedback && session.feedback.summary) || "";

    // Generate PDF using pdf-lib
    const pdfDoc = await PDFDocument.create();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    let y = height - 50;

    const addNewPageIfNeeded = () => {
      if (y < 60) {
        page = pdfDoc.addPage();
        y = height - 50;
      }
    };

    // Title
    page.drawText("PrepTalk - Interview Feedback Report", { x: 50, y, size: 18, font: helveticaBold, color: rgb(0.35, 0.22, 0.76) });
    y -= 30;
    
    // Question
    if (session.question) {
      page.drawText("Question:", { x: 50, y, size: 12, font: helveticaBold });
      y -= 16;
      const qText = sanitize(session.question).substring(0, 120);
      page.drawText(qText, { x: 60, y, size: 11, font: helveticaFont, color: rgb(0.3, 0.3, 0.3) });
      y -= 22;
    }

    // Transcript
    if (session.transcript) {
      page.drawText("Your Response:", { x: 50, y, size: 12, font: helveticaBold });
      y -= 16;
      const tText = sanitize(session.transcript).substring(0, 300);
      page.drawText(tText, { x: 60, y, size: 10, font: helveticaFont, color: rgb(0.3, 0.3, 0.3), maxWidth: width - 120 });
      y -= 40;
    }

    // Scores
    addNewPageIfNeeded();
    page.drawText("Scores:", { x: 50, y, size: 12, font: helveticaBold });
    y -= 18;
    if (scores.fluency !== undefined) { page.drawText(`Fluency: ${scores.fluency}/10`, { x: 60, y, size: 11, font: helveticaFont }); y -= 15; }
    if (scores.grammar !== undefined) { page.drawText(`Grammar: ${scores.grammar}/10`, { x: 60, y, size: 11, font: helveticaFont }); y -= 15; }
    if (scores.confidence !== undefined) { page.drawText(`Confidence: ${scores.confidence}/10`, { x: 60, y, size: 11, font: helveticaFont }); y -= 15; }
    if (scores.relevance !== undefined) { page.drawText(`Relevance: ${scores.relevance}/10`, { x: 60, y, size: 11, font: helveticaFont }); y -= 15; }
    if (scores.overall !== undefined) { page.drawText(`Overall: ${scores.overall}/10`, { x: 60, y, size: 11, font: helveticaFont }); y -= 20; }

    // Summary
    if (summary) {
      addNewPageIfNeeded();
      page.drawText("AI Summary:", { x: 50, y, size: 12, font: helveticaBold });
      y -= 16;
      page.drawText(sanitize(summary).substring(0, 300), { x: 60, y, size: 10, font: helveticaFont, color: rgb(0.3, 0.3, 0.3), maxWidth: width - 120 });
      y -= 30;
    }

    // Strengths
    addNewPageIfNeeded();
    const strengthsList = (analysis.strengths || strongPoints || []) as string[];
    if (strengthsList.length > 0) {
      page.drawText("Strengths:", { x: 50, y, size: 12, font: helveticaBold });
      y -= 16;
      strengthsList.forEach((p: string) => {
        addNewPageIfNeeded();
        page.drawText(`- ${sanitize(p).substring(0, 100)}`, { x: 60, y, size: 10, font: helveticaFont });
        y -= 14;
      });
      y -= 8;
    }

    // Improvements / Weak Points
    addNewPageIfNeeded();
    const improvementsList = (analysis.improvements || weakPoints || []) as string[];
    if (improvementsList.length > 0) {
      page.drawText("Areas for Improvement:", { x: 50, y, size: 12, font: helveticaBold });
      y -= 16;
      improvementsList.forEach((p: string) => {
        addNewPageIfNeeded();
        page.drawText(`- ${sanitize(p).substring(0, 100)}`, { x: 60, y, size: 10, font: helveticaFont });
        y -= 14;
      });
      y -= 8;
    }

    // Suggestions/Tips
    addNewPageIfNeeded();
    const allTips = (suggestions.length > 0 ? suggestions : tips) as string[];
    if (allTips.length > 0) {
      page.drawText("Suggestions:", { x: 50, y, size: 12, font: helveticaBold });
      y -= 16;
      allTips.forEach((p: string) => {
        addNewPageIfNeeded();
        page.drawText(`- ${sanitize(p).substring(0, 100)}`, { x: 60, y, size: 10, font: helveticaFont });
        y -= 14;
      });
    }

    const pdfBytes = await pdfDoc.save();
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="feedback.pdf"`,
      },
    });
  } catch (error) {
    console.error("[PDF-lib generation error]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
