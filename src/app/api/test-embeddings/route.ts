import { NextRequest, NextResponse } from 'next/server';
import { embedText } from '@/utils/embeddings';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  try {
    const cfg = {
      project: process.env.GCP_PROJECT_ID,
      location: process.env.GCP_VERTEX_LOCATION,
      model: process.env.VERTEX_EMBEDDING_MODEL_ID,
      keyFile: process.env.GCP_KEY_FILE,
    };
    console.log('TEST-EMBEDDINGS config:', cfg);
    const vec = await embedText('hello world');
    return NextResponse.json({ ok: true, dim: vec.length, sample: vec.slice(0, 5), config: cfg });
  } catch (e: any) {
    console.error('TEST-EMBEDDINGS failed:', e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
