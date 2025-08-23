import { NextRequest, NextResponse } from 'next/server';
import { legalModel } from '@/utils/vertexClient';

// --- Utilities ---
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
  // Try to extract JSON between first '{' and last '}' if extras are present
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    const candidate = s.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // Try to find the largest valid JSON substring
      for (let i = end; i > start; i--) {
        try {
          return JSON.parse(s.slice(start, i));
        } catch {}
      }
    }
  }
  // Try to find any JSON object in the string
  const jsonMatch = s.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {}
  }
  // Final attempt
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

  // Combine summaries
  out.short_summary = parts.map(p => p.short_summary).filter(Boolean).join('\n\n');

  // Key points (dedupe)
  const kpSet = new Set<string>();
  for (const p of parts) {
    for (const k of (p.key_points || [])) kpSet.add(k.trim());
  }
  out.key_points = Array.from(kpSet).slice(0, 12);

  // Extracted fields: take first non-empty
  for (const field of Object.keys(out.extracted)) {
    for (const p of parts) {
      const v = p.extracted?.[field];
      if (v && !out.extracted[field]) {
        out.extracted[field] = v;
        break;
      }
    }
  }

  // Risks: concat + small cap
  for (const p of parts) {
    if (Array.isArray(p.risks)) out.risks.push(...p.risks);
  }
  if (out.risks.length > 10) out.risks = out.risks.slice(0, 10);

  // Disclaimers: ensure at least one
  const dis = new Set<string>();
  for (const p of parts) for (const d of (p.disclaimers || [])) dis.add(d);
  if (dis.size === 0) dis.add('This is an automated, informational summary and not legal advice.');
  out.disclaimers = Array.from(dis);

  return out;
}

// --- Prompt builders ---
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

// --- API handler ---
export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Missing "text" (string) in body' }, { status: 400 });
    }

    // TEST: If text is '__test__', send a minimal prompt to Vertex AI
    if (text === "__test__") {
      const prompt = "Summarize: Hello world. The parties are Alice and Bob.";
      const result = await askGeminiForJson(prompt);
      return NextResponse.json({ testPrompt: prompt, result });
    }

    // 1) Chunk
    const chunks = splitIntoChunks(text);
    console.log('Chunks count:', chunks.length, 'Chunk lengths:', chunks.map(c => c.length));

    // 2) Per-chunk analysis
    const perChunkResults = [];
    for (const chunk of chunks) {
      const prompt = buildChunkPrompt(chunk);
      // Retry once if JSON parse fails
      try {
        const result = await askGeminiForJson(prompt);
        perChunkResults.push(result);
      } catch (e1) {
        // Try a stricter re-ask
        const retryPrompt = prompt + '\n\nREMINDER: Output MUST be valid JSON. No backticks. No extra text.';
        const result = await askGeminiForJson(retryPrompt);
        perChunkResults.push(result);
      }
    }

    // 3) Merge
    const merged = mergeResults(perChunkResults);

    // 4) Add a standard disclaimer
    if (!merged.disclaimers?.length) {
      merged.disclaimers = ['This is an automated, informational summary and not legal advice.'];
    }

    return NextResponse.json(merged);
  } catch (err: any) {
    console.error('Simplify error:', err);
    return NextResponse.json({ error: err.message || 'Simplify failed' }, { status: 500 });
  }
}