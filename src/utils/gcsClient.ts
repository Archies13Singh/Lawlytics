import { Storage } from '@google-cloud/storage';

export const storage = new Storage({
  keyFilename: process.env.GCP_KEY_FILE,
});

export const bucket = storage.bucket(process.env.GCS_BUCKET_NAME as string);