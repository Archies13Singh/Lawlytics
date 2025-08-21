import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

const client = new DocumentProcessorServiceClient({
  keyFilename: path.join(process.cwd(), process.env.GCP_KEY_FILE),
});

export async function POST(req: NextRequest) {
  try {
    const { gcsUri } = await req.json();
    if (!gcsUri) {
      return NextResponse.json({ error: 'Missing gcsUri' }, { status: 400 });
    }

    const name = `projects/${process.env.GCP_PROJECT_ID}/locations/${process.env.GCP_LOCATION}/processors/${process.env.GCP_PROCESSOR_ID}`;

    const request = {
      name,
      rawDocument: undefined, // Since we're reading from GCS
      inputDocuments: {
        gcsDocuments: {
          documents: [{ gcsUri, mimeType: 'application/pdf' }],
        },
      },
    };

    const [result] = await client.batchProcessDocuments(request);

    // This waits for the batch process to complete
    await result.promise();

    // The output will be stored in GCS under output config (set in processor)
    // For now, we’ll just return success
    return NextResponse.json({ message: 'Processing started. Check GCS output.' });

  } catch (error: any) {
    console.error('Document AI Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
