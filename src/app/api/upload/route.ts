import { NextResponse } from 'next/server';
import { bucket } from '@/utils/gcsClient';
import { adminAuth } from '@/utils/firebaseAdmin';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    // Verify user authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return NextResponse.json({ 
        error: 'Unauthorized - No token provided',
        details: 'Authorization header is missing or invalid'
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decodedToken;
    
    try {
      console.log('Verifying Firebase ID token...');
      decodedToken = await adminAuth.verifyIdToken(token);
      console.log('Token verified for user:', decodedToken.uid);
    } catch (error: any) {
      console.error('Firebase token verification failed:', error);
      return NextResponse.json({ 
        error: 'Unauthorized - Invalid token',
        details: error.message,
        code: error.code
      }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      console.error('No file in form data');
      return NextResponse.json({ 
        error: 'No file uploaded',
        details: 'File field is missing from form data'
      }, { status: 400 });
    }

    console.log('File received:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      console.error('Invalid file type:', file.type);
      return NextResponse.json({ 
        error: 'Invalid file type. Only PDF and Word documents are allowed.',
        details: `Received file type: ${file.type}`
      }, { status: 400 });
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      console.error('File too large:', file.size);
      return NextResponse.json({ 
        error: 'File size too large. Maximum size is 10MB.',
        details: `Received file size: ${file.size} bytes`
      }, { status: 400 });
    }

    // Create buffer from file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate stable path with user ID
    const docId = uuidv4();
    const safeName = file.name.replace(/[^\w.\-]+/g, '_');
    const objectName = `uploads/${decodedToken.uid}/${docId}/${safeName}`;

    console.log('Uploading to GCS:', objectName);

    // Upload to GCS
    const gcsFile = bucket.file(objectName);
    await gcsFile.save(buffer, { 
      contentType: file.type || 'application/pdf',
      metadata: {
        customMetadata: {
          userId: decodedToken.uid,
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        }
      }
    });

    console.log('File uploaded to GCS successfully');

    // Generate URLs
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${objectName}`;
    const gsUri = `gs://${bucket.name}/${objectName}`;

    const response = { 
      url: publicUrl, 
      gsUri, 
      objectName, 
      docId,
      userId: decodedToken.uid 
    };

    console.log('Upload successful, returning response:', response);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Upload error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: 'Upload failed', 
        details: error.message,
        stack: error.stack
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: 'Upload failed', 
      details: 'Unknown error occurred',
      errorObject: error
    }, { status: 500 });
  }
}