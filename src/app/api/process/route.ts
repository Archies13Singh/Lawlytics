import { NextRequest, NextResponse } from 'next/server';
import { docaiClient, DOC_PROCESSOR_NAME } from '@/utils/docaiClient';
import { downloadGcsObject } from '@/utils/gcsRead';

type ProcessBody = { objectName?: string; gsUri?: string; mimeType?: string };

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ProcessBody;
    const objectName = body.objectName || (body.gsUri ? body.gsUri.split(`${process.env.GCS_BUCKET_NAME}/`)[1] : undefined);

    if (!objectName) {
      return NextResponse.json({ error: 'Missing objectName or gsUri' }, { status: 400 });
    }

    // 1) Download bytes from GCS
    const buffer = await downloadGcsObject(objectName);

    // 2) Call Document AI (processDocument) synchronously
    const [result] = await docaiClient.processDocument({
      name: DOC_PROCESSOR_NAME,
      rawDocument: {
        content: buffer,
        mimeType: body.mimeType || 'application/pdf',
      },
    });
    const document = result.document;
    let text = document?.text;
    if ((!text || text.length === 0) && document && document.pages && document.text) {
      // Fallback: extract text from paragraphs' textAnchor textSegments
      text = document.pages
        .flatMap((page) =>
          (page.paragraphs || []).map((para) => {
            if (
              para.layout &&
              para.layout.textAnchor &&
              Array.isArray(para.layout.textAnchor.textSegments) &&
              document.text
            ) {
              return para.layout.textAnchor.textSegments
                .map((segment) => {
                  const start = Number(segment.startIndex) || 0;
                  const end = Number(segment.endIndex) || 0;
                  return document.text ? document.text.substring(start, end) : '';
                })
                .join('');
            }
            return '';
          })
        )
        .join('\n');
    }
    if (!text) text = '';
    const pages = document?.pages?.length ?? 0;

    // (Optional) simple heuristics you can iterate on later:
    // Build a rough index of page ranges for clauses/headings if present
    const pageSummaries = (document?.pages ?? []).map((p, idx) => ({
      page: idx + 1,
      paragraphs: p.paragraphs?.length ?? 0,
      blocks: p.blocks?.length ?? 0,
      lines: p.lines?.length ?? 0,
      tokens: p.tokens?.length ?? 0,
    }));

    return NextResponse.json({
      objectName,
      pages,
      textLength: text.length,
      pageSummaries,
      text,
    });
    
  } catch (err: any) {
    console.error('DocAI process error:', err);
    return NextResponse.json({ error: err.message || 'DocAI failed' }, { status: 500 });
  }
}
