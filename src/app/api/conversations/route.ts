import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/utils/firebaseAdmin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const { uid } = await adminAuth.verifyIdToken(token);

    try {
      const snapshot = await adminDb
        .collection('conversations')
        .where('userId', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      return NextResponse.json({ conversations: items });
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (msg.includes('The query requires an index')) {
        const fallbackSnap = await adminDb
          .collection('conversations')
          .where('userId', '==', uid)
          .limit(200)
          .get();
        const items = fallbackSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        items.sort((a: any, b: any) => {
          const da = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt?.seconds || 0) * 1000;
          const db = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt?.seconds || 0) * 1000;
          return db - da;
        });
        return NextResponse.json({ conversations: items });
      }
      throw err;
    }
  } catch (e: any) {
    console.error('GET /conversations error', e);
    return NextResponse.json({ error: e.message || 'Failed to list conversations' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const { uid } = await adminAuth.verifyIdToken(token);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing conversation id' }, { status: 400 });

    const convRef = adminDb.collection('conversations').doc(id);
    const snap = await convRef.get();
    if (!snap.exists) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    const data = snap.data();
    if (data?.userId !== uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Delete messages subcollection (first 500)
    const msgsSnap = await convRef.collection('messages').limit(500).get();
    const batch = adminDb.batch();
    msgsSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    await convRef.delete();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('DELETE /conversations error', e);
    return NextResponse.json({ error: e.message || 'Failed to delete conversation' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.substring(7);
    const { uid } = await adminAuth.verifyIdToken(token);

    const { documentId, title } = await req.json();
    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
    }

    const ref = await adminDb.collection('conversations').add({
      userId: uid,
      documentId,
      title: title || 'Legal Chat',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ id: ref.id });
  } catch (e: any) {
    console.error('POST /conversations error', e);
    return NextResponse.json({ error: e.message || 'Failed to create conversation' }, { status: 500 });
  }
}
