import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/utils/firebaseAdmin';
import { embedText } from '@/utils/embeddings';
import { cosineSimilarity } from '@/utils/similarity';
import { legalModel } from '@/utils/vertexClient';

export const runtime = 'nodejs';

// -----------------------------
// Clean rebuild starts here

async function retrieveTopChunks(documentId: string, queryVector: number[], k = 12) {
  let items: any[] = [];
  try {
    const snap = await adminDb
      .collection('documentChunks')
      .where('documentId', '==', documentId)
      .orderBy('chunkIndex', 'asc')
      .limit(200)
      .get();
    items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.includes('The query requires an index')) {
      const snap2 = await adminDb
        .collection('documentChunks')
        .where('documentId', '==', documentId)
        .limit(200)
        .get();
      items = snap2.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      items.sort((a, b) => (a.chunkIndex ?? 0) - (b.chunkIndex ?? 0));
    } else {
      throw err;
    }
  }
  const scored = items.map((it) => ({
    id: it.id,
    text: it.text as string,
    embedding: it.embedding as number[],
    score: cosineSimilarity(queryVector, (it.embedding as number[]) || []),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

async function fetchManyChunks(documentId: string, limit = 500) {
  let items: any[] = [];
  try {
    const snap = await adminDb
      .collection('documentChunks')
      .where('documentId', '==', documentId)
      .limit(limit)
      .get();
    items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    items.sort((a, b) => (a.chunkIndex ?? 0) - (b.chunkIndex ?? 0));
  } catch {
    // best effort
  }
  return items as Array<{ id: string; text: string; chunkIndex?: number }>;
}

async function translateToEnglish(text: string, srcLang?: string): Promise<string> {
  try {
    const prompt = [
      {
        role: 'user' as const,
        parts: [
          {
            text:
              `Translate the following text to English. Only return the translated text, no explanations.\n` +
              (srcLang ? `Source language: ${srcLang}\n` : '') +
              `TEXT:\n"""\n${text}\n"""`,
          },
        ],
      },
    ];
    const resp = await legalModel.generateContent({ contents: prompt, generationConfig: { temperature: 0.0, maxOutputTokens: 256 } });
    return resp.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || text;
  } catch {
    return text;
  }
}

async function translateToLanguage(text: string, targetLang: string): Promise<string> {
  try {
    const prompt = [
      {
        role: 'user' as const,
        parts: [
          {
            text:
              `Translate the following text to LANGUAGE=${targetLang}. Only return the translated text, no explanations.\n` +
              `TEXT:\n"""\n${text}\n"""`,
          },
        ],
      },
    ];
    const resp = await legalModel.generateContent({ contents: prompt, generationConfig: { temperature: 0.0, maxOutputTokens: 800 } });
    return resp.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || text;
  } catch {
    return text;
  }
}

function looksLikeSummaryRequest(text: string): boolean {
  const q = (text || '').toLowerCase();
  return (
    q.includes('summary') ||
    q.includes('summarize') ||
    q.includes('summarise') ||
    q.includes('short summary') ||
    q.includes(' सारांश') || q.includes('सारांश') || q.includes('saaransh') ||
    q.includes('सार') || q.includes('सार दे')
  );
}

function buildSummaryPrompt(contexts: { text: string; score: number }[], language = 'en') {
  const contextText = contexts.map((c) => c.text).join('\n\n');
  return [
    {
      role: 'user' as const,
      parts: [
        {
          text:
            `Create a very concise, factual 2-3 sentence summary of the document using ONLY the CONTEXT below. ` +
            `Answer strictly in LANGUAGE=${language}. Do not add information not present in context.\n\n` +
            `CONTEXT:\n"""\n${contextText}\n"""`,
        },
      ],
    },
  ];
}

function buildChatPrompt(question: string, contexts: { text: string; score: number }[], language = 'en') {
  const contextText = contexts
    .map((c, i) => `Chunk ${i + 1} (score=${c.score.toFixed(3)}):\n${c.text}`)
    .join('\n\n');
  return [
    {
      role: 'user' as const,
      parts: [
        {
          text:
            `You are a helpful legal assistant. Use ONLY the CONTEXT below. ` +
            `If the user asks for a summary, produce a concise, faithful summary derived from the context. ` +
            `If the user asks for translation, translate accurately from the context. ` +
            `If the user asks a question not supported by the context, respond that the information is not found. ` +
            `Be concise but precise.\n\n` +
            `LANGUAGE: ${language}\n` +
            `CONTEXT:\n` +
            `"""\n${contextText}\n"""\n\n` +
            `QUESTION: ${question}`,
        },
      ],
    },
  ];
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const decoded = await adminAuth.verifyIdToken(token);

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');
    if (!conversationId) return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 });

    const convRef = adminDb.collection('conversations').doc(conversationId);
    const convSnap = await convRef.get();
    if (!convSnap.exists) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    if ((convSnap.data() as any)?.userId !== decoded.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const msgsSnap = await convRef.collection('messages').orderBy('createdAt', 'asc').limit(200).get();
    const messages = msgsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ messages });
  } catch (e: any) {
    console.error('GET /chat error', e);
    return NextResponse.json({ error: e.message || 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const decoded = await adminAuth.verifyIdToken(token);

    const { conversationId, documentId, question, language = 'en', greet } = await req.json();
    if (!conversationId || !documentId) {
      return NextResponse.json({ error: 'Missing conversationId or documentId' }, { status: 400 });
    }

    // Verify conversation ownership
    const convRef = adminDb.collection('conversations').doc(conversationId);
    const convSnap = await convRef.get();
    if (!convSnap.exists) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    const convData = convSnap.data();
    if (convData?.userId !== decoded.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Localized greeting
    if (greet === true) {
      const messagesCol = convRef.collection('messages');
      const now = new Date();
      const greetPrompt = [
        {
          role: 'user' as const,
          parts: [
            {
              text:
                `Write a short 1-2 sentence greeting in LANGUAGE=${language}. ` +
                `Tell the user their document has been processed and offer help: summarize, extract key terms, or answer questions about clauses.`,
            },
          ],
        },
      ];
      const g = await legalModel.generateContent({ contents: greetPrompt, generationConfig: { temperature: 0.2, maxOutputTokens: 120 } });
      const greeting = g.response?.candidates?.[0]?.content?.parts?.[0]?.text || 'Hello! How can I help with your legal document?';
      await messagesCol.add({ role: 'assistant', content: greeting, createdAt: now });
      await convRef.update({ updatedAt: now });
      return NextResponse.json({ answer: greeting, contexts: [] });
    }

    // 1) Embed the question (translate to English for retrieval if non-English)
    console.log('CHAT: embedding question with Vertex', {
      project: process.env.GCP_PROJECT_ID,
      location: process.env.GCP_VERTEX_LOCATION,
      model: process.env.VERTEX_EMBEDDING_MODEL_ID,
    });
    let qVec: number[];
    try {
      const queryForEmbedding = language && language !== 'en' ? await translateToEnglish(question, language) : question;
      qVec = await embedText(queryForEmbedding);
    } catch (err: any) {
      console.error('CHAT: embedText failed', err?.message || err);
      return NextResponse.json({ error: 'Embedding failed. Please verify Vertex config and service account permissions.' }, { status: 500 });
    }

    // 2) Retrieve top-k chunks
    const top = await retrieveTopChunks(documentId, qVec, 12);
    console.log('CHAT: retrieved top chunks', { total: top.length, topScore: top[0]?.score });

    // 3) Build and run prompt
    const contexts = top.map((t) => ({ text: t.text, score: t.score }));
    const isSummary = looksLikeSummaryRequest(question);
    const contents = isSummary
      ? buildSummaryPrompt(contexts, language)
      : buildChatPrompt(question, contexts, language);
    const resp = await legalModel.generateContent({ contents, generationConfig: { temperature: 0.2, maxOutputTokens: 800 }, safetySettings: [] });
    let answer = resp.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // 3b) Fallback summarization if summary requested and answer weak
    if (isSummary) {
      const notFoundHints = ['not found', 'do not find', 'cannot find', 'नहीं मिली', 'नहीं मिल', 'मिला नहीं'];
      const looksEmpty = !answer || answer.trim().length < 20;
      const looksNotFound = notFoundHints.some((h) => answer.toLowerCase().includes(h));
      if (looksEmpty || looksNotFound) {
        const many = await fetchManyChunks(documentId, 500);
        if (many.length > 0) {
          const merged = many.map((m) => ({ text: m.text, score: 1 }));
          const fb = await legalModel.generateContent({ contents: buildSummaryPrompt(merged, language), generationConfig: { temperature: 0.2, maxOutputTokens: 600 } });
          const alt = fb.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (alt) answer = alt;
        }
      }
    }

    // 3c) Enforce final language
    if (language && language !== 'en' && answer) {
      const asciiOnly = answer.replace(/[\x00-\x7F]/g, '').length === 0;
      if (asciiOnly) {
        try {
          const translated = await translateToLanguage(answer, language);
          if (translated) answer = translated;
        } catch {}
      }
    }

    // 4) Persist messages
    const messagesCol = convRef.collection('messages');
    const now = new Date();
    await messagesCol.add({ role: 'user', content: question, createdAt: now });
    await messagesCol.add({ role: 'assistant', content: answer, contexts: top.slice(0, 5).map((t) => ({ id: t.id, score: t.score })), createdAt: now });
    await convRef.update({ updatedAt: now });

    return NextResponse.json({ answer, contexts: top });
  } catch (e: any) {
    console.error('POST /chat error', e);
    return NextResponse.json({ error: e.message || 'Chat failed' }, { status: 500 });
  }
}
