import path from 'path';
import { VertexAI } from '@google-cloud/vertexai';

const project = process.env.GCP_PROJECT_ID || "587742710924";
const location = process.env.GCP_VERTEX_LOCATION || 'us-central1';
const modelId = process.env.VERTEX_MODEL_ID || 'gemini-2.0-flash-001';

// Set up authentication using service account (base64 JSON, inline JSON, or file path)
const KEY_B64 = process.env.GCP_KEY_JSON_B64;
const KEY = process.env.GCP_KEY_FILE || path.join(process.cwd(), 'upload-service.json');
let googleAuthOptions: any;
if (KEY_B64) {
  const json = Buffer.from(KEY_B64, 'base64').toString('utf8');
  const sa = JSON.parse(json);
  googleAuthOptions = {
    projectId: sa.project_id || process.env.GCP_PROJECT_ID,
    credentials: { client_email: sa.client_email, private_key: sa.private_key },
  } as any;
} else if (typeof KEY === 'string' && KEY.trim().startsWith('{')) {
  const sa = JSON.parse(KEY);
  googleAuthOptions = {
    projectId: sa.project_id || process.env.GCP_PROJECT_ID,
    credentials: { client_email: sa.client_email, private_key: sa.private_key },
  } as any;
} else {
  googleAuthOptions = { keyFilename: path.isAbsolute(KEY) ? KEY : path.join(process.cwd(), KEY) } as any;
}

const vertex = new VertexAI({ 
  project, 
  location,
  googleAuthOptions
});

export const legalModel = vertex.getGenerativeModel({
  model: modelId,
});