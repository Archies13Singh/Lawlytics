import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/utils/firebaseAdmin';
import { embedText } from '@/utils/embeddings';
import { cosineSimilarity } from '@/utils/similarity';
import { legalModel } from '@/utils/vertexClient';

export const runtime = 'nodejs';

async function retrieveTopChunks(documentId: string, queryVector: number[], k = 8) {
  // pull up to 200 chunks; fall back if index is missing
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
            `You are a helpful legal assistant. Answer the user's question strictly using the CONTEXT below. ` +
            `If the answer is not in context, say you don't find it in the document. Be concise but precise.\n\n` +
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

    // If greet flag set, just create a greeting message and return
    if (greet === true) {
      const convRef = adminDb.collection('conversations').doc(conversationId);
      const messagesCol = convRef.collection('messages');
      const now = new Date();
      const greeting = 'Your document is recognized as a legal document. How would you like me to help you? For example, I can summarize, extract key terms, or answer questions about clauses.';
      await messagesCol.add({ role: 'assistant', content: greeting, createdAt: now });
      await convRef.update({ updatedAt: now });
      return NextResponse.json({ answer: greeting, contexts: [] });
    }

    // 1) Embed the question
    console.log('CHAT: embedding question with Vertex', {
      project: process.env.GCP_PROJECT_ID,
      location: process.env.GCP_VERTEX_LOCATION,
      model: process.env.VERTEX_EMBEDDING_MODEL_ID,
    });
    let qVec: number[];
    try {
      qVec = await embedText(question);
    } catch (err: any) {
      console.error('CHAT: embedText failed', err?.message || err);
      return NextResponse.json({ error: 'Embedding failed. Please verify Vertex config and service account permissions.' }, { status: 500 });
    }

    // 2) Retrieve top-k chunks
    const top = await retrieveTopChunks(documentId, qVec, 8);
    console.log('CHAT: retrieved top chunks', { total: top.length, topScore: top[0]?.score });

    // 3) Build prompt and ask Vertex AI
    const contents = buildChatPrompt(question, top.map((t) => ({ text: t.text, score: t.score })), language);
    const resp = await legalModel.generateContent({
      contents,
      generationConfig: { temperature: 0.2, maxOutputTokens: 800 },
      safetySettings: [],
    });
    const answer = resp.response?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // 4) Store message in subcollection
    const messagesCol = convRef.collection('messages');
    const now = new Date();
    await messagesCol.add({
      role: 'user',
      content: question,
      createdAt: now,
    });
    await messagesCol.add({
      role: 'assistant',
      content: answer,
      contexts: top.slice(0, 5).map((t) => ({ id: t.id, score: t.score })),
      createdAt: now,
    });
    await convRef.update({ updatedAt: now });

    return NextResponse.json({ answer, contexts: top });
  } catch (e: any) {
    console.error('POST /chat error', e);
    return NextResponse.json({ error: e.message || 'Chat failed' }, { status: 500 });
  }
}
