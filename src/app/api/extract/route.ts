import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

function createClient(): DocumentProcessorServiceClient {
  const key = process.env.GCP_KEY_FILE;
  if (!key) return new DocumentProcessorServiceClient();
  if (key.trim().startsWith('{')) {
    try {
      const sa = JSON.parse(key);
      const client_email = sa.client_email as string | undefined;
      const private_key = sa.private_key as string | undefined;
      const projectId = (sa.project_id as string | undefined) || process.env.GCP_PROJECT_ID;
      if (!client_email || !private_key) throw new Error('Invalid inline SA JSON for Document AI');
      return new DocumentProcessorServiceClient({
        projectId,
        credentials: { client_email, private_key },
      } as any);
    } catch (e) {
      console.error('Failed to parse inline GCP_KEY_FILE for Document AI route, using path.', e);
    }
  }
  const keyFilename = path.isAbsolute(key) ? key : path.join(process.cwd(), key);
  return new DocumentProcessorServiceClient({ keyFilename } as any);
}

const client = createClient();

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