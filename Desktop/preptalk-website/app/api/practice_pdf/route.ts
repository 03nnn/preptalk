import { NextRequest, NextResponse } from "next/server";

export const runtime = 'nodejs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Replace unsupported hyphens
function sanitize(text: string): string {
  return text.replace(/[\u2011\u2013]/g, '-');
}

export async function POST(request: NextRequest) {
  try {
    const { conversation, user_id } = await request.json();
    if (!Array.isArray(conversation)) {
      return NextResponse.json({ error: 'Conversation array missing' }, { status: 400 });
    }

    const pdfDoc = await PDFDocument.create();
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    let y = height - 40;
    page.drawText('Practice Interview Transcript', { x: 50, y, size: 20, font: helvetica, color: rgb(0,0,0) });
    y -= 30;

    let index = 1;
    for (const turn of conversation) {
      const q = sanitize(turn.question);
      const t = sanitize(turn.transcript);
      page.drawText(`Q${index}: ${q}`, { x: 50, y, size: 12, font: helvetica });
      y -= 20;
      page.drawText(`A${index}: ${t}`, { x: 60, y, size: 12, font: helvetica });
      y -= 30;
      if (y < 50) {
        page = pdfDoc.addPage();
        y = height - 40;
      }
      index++;
    }

    const pdfBytes = await pdfDoc.save();
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="practice.pdf"`,
      },
    });
  } catch (error) {
    console.error('[Practice PDF error]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
