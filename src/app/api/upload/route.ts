import { NextResponse } from 'next/server';
import { bucket } from '@/utils/gcsClient';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  try {
    // buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // stable path
    const docId = uuidv4();
    const safeName = file.name.replace(/[^\w.\-]+/g, '_');
    const objectName = `uploads/${docId}/${safeName}`;

    // upload to GCS
    const gcsFile = bucket.file(objectName);
    await gcsFile.save(buffer, { contentType: file.type || 'application/pdf' });

    // (keep private; avoid makePublic in prod)
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${objectName}`;
    const gsUri = `gs://${bucket.name}/${objectName}`;

    return NextResponse.json({ url: publicUrl, gsUri, objectName, docId });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}