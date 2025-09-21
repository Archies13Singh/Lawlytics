import { Storage } from '@google-cloud/storage';
import path from 'path';

// Check if required environment variables are set
if (!process.env.GCP_KEY_FILE && !process.env.GCP_KEY_JSON_B64) {
  console.error('GCP_KEY_FILE or GCP_KEY_JSON_B64 environment variable is not set');
  throw new Error('GCP_KEY_FILE environment variable is required');
}

if (!process.env.GCS_BUCKET_NAME) {
  console.error('GCS_BUCKET_NAME environment variable is not set');
  throw new Error('GCS_BUCKET_NAME environment variable is required');
}

function createStorage(): Storage {
  const b64 = process.env.GCP_KEY_JSON_B64;
  const key = process.env.GCP_KEY_FILE as string | undefined;

  // If GCP_KEY_FILE looks like JSON, parse and use inline credentials
  if (b64) {
    try {
      const json = Buffer.from(b64, 'base64').toString('utf8');
      const sa = JSON.parse(json);
      const client_email = sa.client_email as string | undefined;
      const private_key = sa.private_key as string | undefined;
      const projectId = (sa.project_id as string | undefined) || process.env.GCP_PROJECT_ID;
      if (!client_email || !private_key) {
        throw new Error('Invalid base64 service account JSON: missing client_email/private_key');
      }
      return new Storage({ projectId, credentials: { client_email, private_key } });
    } catch (e) {
      console.error('Failed to parse GCP_KEY_JSON_B64. Falling back to GCP_KEY_FILE.', e);
    }
  }

  if (key && key.trim().startsWith('{')) {
    try {
      const sa = JSON.parse(key);
      const client_email = sa.client_email as string | undefined;
      const private_key = sa.private_key as string | undefined;
      const projectId = (sa.project_id as string | undefined) || process.env.GCP_PROJECT_ID;
      if (!client_email || !private_key) {
        throw new Error('Invalid inline service account JSON: missing client_email/private_key');
      }
      return new Storage({
        projectId,
        credentials: { client_email, private_key },
      });
    } catch (e) {
      console.error('Failed to parse GCP_KEY_FILE as inline JSON.');
      throw new Error('GCP_KEY_FILE appears to be inline JSON but is malformed. Ensure it is a single-line JSON with escaped newlines (\\n), or use GCP_KEY_JSON_B64.');
    }
  }

  // Otherwise treat it as a file path
  const keyFilename = key ? (path.isAbsolute(key) ? key : path.join(process.cwd(), key)) : undefined;
  return new Storage({ keyFilename });
}

export const storage = createStorage();

export const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

console.log(`✅ GCS client initialized for bucket: ${process.env.GCS_BUCKET_NAME}`);
console.log(`✅ GCS auth mode: ${process.env.GCP_KEY_JSON_B64 ? 'base64 JSON' : (process.env.GCP_KEY_FILE?.trim().startsWith('{') ? 'inline JSON' : 'key file path')}`);