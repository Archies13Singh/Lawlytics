import { NextResponse } from 'next/server';
import { bucket } from '@/utils/gcsClient';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    console.log('Test upload route called');
    
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
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

    // Create buffer from file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate test path
    const docId = uuidv4();
    const safeName = file.name.replace(/[^\w.\-]+/g, '_');
    const objectName = `test-uploads/${docId}/${safeName}`;

    console.log('Uploading to GCS:', objectName);

    // Upload to GCS
    const gcsFile = bucket.file(objectName);
    await gcsFile.save(buffer, { 
      contentType: file.type || 'application/pdf',
      metadata: {
        customMetadata: {
          test: 'true',
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
      test: true
    };

    console.log('Test upload successful, returning response:', response);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Test upload error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: 'Test upload failed', 
        details: error.message,
        stack: error.stack
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: 'Test upload failed', 
      details: 'Unknown error occurred',
      errorObject: error
    }, { status: 500 });
  }
}
