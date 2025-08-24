import { Storage } from '@google-cloud/storage';

// Check if required environment variables are set
if (!process.env.GCP_KEY_FILE) {
  console.error('GCP_KEY_FILE environment variable is not set');
  throw new Error('GCP_KEY_FILE environment variable is required');
}

if (!process.env.GCS_BUCKET_NAME) {
  console.error('GCS_BUCKET_NAME environment variable is not set');
  throw new Error('GCS_BUCKET_NAME environment variable is required');
}

export const storage = new Storage({
  keyFilename: process.env.GCP_KEY_FILE,
});

export const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

console.log(`✅ GCS client initialized for bucket: ${process.env.GCS_BUCKET_NAME}`);
console.log(`✅ Service account: ${process.env.GCP_KEY_FILE}`);