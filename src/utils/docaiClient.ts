import path from 'path';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

function createDocAiClient(): DocumentProcessorServiceClient {
  const b64 = process.env.GCP_KEY_JSON_B64;
  const key = process.env.GCP_KEY_FILE;
  if (b64) {
    try {
      const json = Buffer.from(b64, 'base64').toString('utf8');
      const sa = JSON.parse(json);
      const client_email = sa.client_email as string | undefined;
      const private_key = sa.private_key as string | undefined;
      const projectId = (sa.project_id as string | undefined) || process.env.GCP_PROJECT_ID;
      if (!client_email || !private_key) throw new Error('Invalid base64 SA JSON for Document AI');
      return new DocumentProcessorServiceClient({ projectId, credentials: { client_email, private_key } } as any);
    } catch (e) {
      console.error('Failed to parse GCP_KEY_JSON_B64 for Document AI, trying GCP_KEY_FILE.', e);
    }
  }
  if (key && key.trim().startsWith('{')) {
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
      console.error('Failed to parse inline GCP_KEY_FILE for Document AI, using path.', e);
    }
  }
  const keyFilename = key ? (path.isAbsolute(key) ? key : path.join(process.cwd(), key)) : undefined;
  return new DocumentProcessorServiceClient({ keyFilename } as any);
}

export const docaiClient = createDocAiClient();

export const DOC_PROCESSOR_NAME =
  `projects/${process.env.GCP_PROJECT_ID}/locations/${process.env.GCP_LOCATION}/processors/${process.env.GCP_PROCESSOR_ID}`;