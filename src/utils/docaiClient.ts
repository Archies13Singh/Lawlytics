import path from 'path';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

export const docaiClient = new DocumentProcessorServiceClient({
  keyFilename: process.env.GCP_KEY_FILE
    ? path.join(process.cwd(), process.env.GCP_KEY_FILE)
    : undefined,
});

export const DOC_PROCESSOR_NAME =
  `projects/${process.env.GCP_PROJECT_ID}/locations/${process.env.GCP_LOCATION}/processors/${process.env.GCP_PROCESSOR_ID}`;