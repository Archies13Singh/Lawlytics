import path from 'path';
import { VertexAI } from '@google-cloud/vertexai';

const project = process.env.GCP_PROJECT_ID || "587742710924";
const location = process.env.GCP_VERTEX_LOCATION || 'us-central1';
const modelId = process.env.VERTEX_MODEL_ID || 'gemini-2.0-flash-001';

// Set up authentication using service account
const keyFilename = path.join(process.cwd(), 'upload-service.json');

const vertex = new VertexAI({ 
  project, 
  location,
  googleAuthOptions: {
    keyFilename: keyFilename
  }
});

export const legalModel = vertex.getGenerativeModel({
  model: modelId,
});