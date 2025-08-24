import { NextRequest, NextResponse } from 'next/server';
import { legalModel } from '@/utils/vertexClient';
import { getDocumentFromGCS, downloadGcsObject } from '@/utils/gcsRead';
import { docaiClient, DOC_PROCESSOR_NAME } from '@/utils/docaiClient';
import { adminAuth, adminDb } from '@/utils/firebaseAdmin';
import { doc, updateDoc } from 'firebase-admin/firestore';

// --- Utilities (from simplify) ---
function splitIntoChunks(text: string, maxChars = 15000): string[] {
  if (text.length <= maxChars) return [text];
  const paras = text.split(/\n{2,}/); // split on blank lines
  const chunks: string[] = [];
  let current = '';
  for (const p of paras) {
    if ((current + '\n\n' + p).length > maxChars) {
      if (current) chunks.push(current);
      current = p;
    } else {
      current = current ? current + '\n\n' + p : p;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function safeJsonParse(s: string) {
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    const candidate = s.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      for (let i = end; i > start; i--) {
        try {
          return JSON.parse(s.slice(start, i));
        } catch {}
      }
    }
  }
  const jsonMatch = s.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {}
  }
  return JSON.parse(s);
}

function mergeResults(parts: any[]) {
  const out: any = {
    short_summary: '',
    key_points: [],
    extracted: {
      parties: '', effective_date: '', term: '', notice_period: '',
      payment_terms: '', security_deposit: '', maintenance_responsibility: '',
      late_fee: '', renewal: '', termination: '', jurisdiction: ''
    },
    risks: [],
    disclaimers: []
  };
  out.short_summary = parts.map(p => p.short_summary).filter(Boolean).join('\n\n');
  const kpSet = new Set<string>();
  for (const p of parts) {
    for (const k of (p.key_points || [])) kpSet.add(k.trim());
  }
  out.key_points = Array.from(kpSet).slice(0, 12);
  for (const field of Object.keys(out.extracted)) {
    for (const p of parts) {
      const v = p.extracted?.[field];
      if (v && !out.extracted[field]) {
        out.extracted[field] = v;
        break;
      }
    }
  }
  for (const p of parts) {
    if (Array.isArray(p.risks)) out.risks.push(...p.risks);
  }
  if (out.risks.length > 10) out.risks = out.risks.slice(0, 10);
  const dis = new Set<string>();
  for (const p of parts) for (const d of (p.disclaimers || [])) dis.add(d);
  if (dis.size === 0) dis.add('This is an automated, informational summary and not legal advice.');
  out.disclaimers = Array.from(dis);
  return out;
}

function buildChunkPrompt(chunk: string) {
  return `
You are a legal document explainer. Read the following contract excerpt and return STRICT JSON ONLY
matching this schema (no markdown, no extra text):
{
  "short_summary": "string",
  "key_points": ["string", "..."],
  "extracted": {
    "parties": "string",
    "effective_date": "string",
    "term": "string",
    "notice_period": "string",
    "payment_terms": "string",
    "security_deposit": "string",
    "maintenance_responsibility": "string",
    "late_fee": "string",
    "renewal": "string",
    "termination": "string",
    "jurisdiction": "string"
  },
  "risks": [
    { "label": "string", "severity": "low|medium|high", "why": "string", "quote": "string" }
  ],
  "disclaimers": ["string"]
}
Rules:
- Write in simple, plain English.
- If a field is not stated, set it to "NOT STATED".
- In risks, include a brief direct quote supporting each risk.
- Do NOT add explanations outside JSON.
CONTRACT EXCERPT:
"""${chunk}"""
`.trim();
}

async function askGeminiForJson(prompt: string) {
  console.log('Vertex prompt length:', prompt.length);
  console.log('Vertex prompt preview:', prompt.slice(0, 500));
  const resp = await legalModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1200,
    },
    safetySettings: [],
  });
  console.log('Vertex full response object:', JSON.stringify(resp, null, 2));
  const text = resp.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  console.log('Vertex raw response:', text);
  if (!text.trim()) {
    console.error('Vertex AI returned an empty response. Full response:', JSON.stringify(resp, null, 2));
    throw new Error('Vertex AI returned an empty response.');
  }
  try {
    return safeJsonParse(text);
  } catch (e) {
    console.error('JSON parse error:', e, 'Raw:', text);
    throw new Error('Vertex AI did not return valid JSON');
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('Analyze API called');
    
    // Verify user authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decodedToken;
    
    try {
      console.log('Verifying Firebase ID token...');
      decodedToken = await adminAuth.verifyIdToken(token);
      console.log('Token verified for user:', decodedToken.uid);
    } catch (error) {
      console.error('Firebase token verification failed:', error);
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    const { gcsUri, documentId } = await req.json();
    console.log('Request data:', { gcsUri, documentId });
    
    if (!gcsUri) {
      console.error('Missing gcsUri in request');
      return NextResponse.json({ error: 'Missing gcsUri' }, { status: 400 });
    }

    // Update document status to analyzing
    if (documentId) {
      try {
        console.log('Updating document status to analyzing...');
        const documentRef = doc(adminDb, 'documents', documentId);
        await updateDoc(documentRef, {
          status: 'analyzing',
          analyzedAt: new Date(),
        });
        console.log('Document status updated to analyzing');
      } catch (error) {
        console.error('Failed to update document status to analyzing:', error);
      }
    }

    console.log('Starting document analysis...');
    console.log('GCS URI:', gcsUri);

    // 1. Download PDF from GCS
    const match = gcsUri.match(/^gs:\/\/([^\/]+)\/(.+)$/);
    if (!match) {
      const error = 'Invalid GCS URI: ' + gcsUri;
      console.error(error);
      throw new Error(error);
    }
    
    const objectName = match[2];
    console.log('Object name:', objectName);
    
    console.log('Downloading document from GCS...');
    const buffer = await downloadGcsObject(objectName);
    console.log('Document downloaded, size:', buffer.length);
    
    // 2. Process PDF with Document AI
    console.log('Processing with Document AI...');
    const [result] = await docaiClient.processDocument({
      name: DOC_PROCESSOR_NAME,
      rawDocument: {
        content: buffer,
        mimeType: 'application/pdf',
      },
    });
    
    const document = result.document;
    let text = '';
    if (document?.text) {
      text = document.text;
    } else if (document?.pages) {
      text = document.pages.map((p: any) => p.text || '').join('\n');
    }
    if (!text) text = '';
    
    console.log('Document text extracted, length:', text.length);
    
    // 3. Chunk and analyze
    console.log('Splitting text into chunks...');
    const chunks = splitIntoChunks(text);
    console.log('Text split into', chunks.length, 'chunks');
    
    const perChunkResults = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing chunk ${i + 1}/${chunks.length}...`);
      
      const prompt = buildChunkPrompt(chunk);
      try {
        const result = await askGeminiForJson(prompt);
        perChunkResults.push(result);
        console.log(`Chunk ${i + 1} processed successfully`);
      } catch (error) {
        console.error(`Error processing chunk ${i + 1}:`, error);
        const retryPrompt = prompt + '\n\nREMINDER: Output MUST be valid JSON. No backticks. No extra text.';
        const result = await askGeminiForJson(retryPrompt);
        perChunkResults.push(result);
        console.log(`Chunk ${i + 1} processed on retry`);
      }
    }
    
    console.log('Merging chunk results...');
    const merged = mergeResults(perChunkResults);
    if (!merged.disclaimers?.length) {
      merged.disclaimers = ['This is an automated, informational summary and not legal advice.'];
    }

    console.log('Analysis completed successfully');

    // Update document status to completed
    if (documentId) {
      try {
        console.log('Updating document status to completed...');
        const documentRef = doc(adminDb, 'documents', documentId);
        await updateDoc(documentRef, {
          status: 'completed',
          analyzedAt: new Date(),
          analysisResult: merged,
        });
        console.log('Document status updated to completed');
      } catch (error) {
        console.error('Failed to update document status to completed:', error);
      }
    }

    const response = {
      gcsUri,
      textLength: text.length,
      summary: merged,
    };
    
    console.log('Returning analysis results');
    return NextResponse.json(response);
  } catch (err: any) {
    console.error('Analyze error:', err);
    
    // Update document status to failed if we have a documentId
    try {
      const { documentId } = await req.json().catch(() => ({}));
      if (documentId) {
        console.log('Updating document status to failed...');
        const documentRef = doc(adminDb, 'documents', documentId);
        await updateDoc(documentRef, {
          status: 'failed',
          analyzedAt: new Date(),
        });
        console.log('Document status updated to failed');
      }
    } catch (error) {
      console.error('Failed to update document status to failed:', error);
    }
    
    return NextResponse.json({ error: err.message || 'Analyze failed' }, { status: 500 });
  }
}