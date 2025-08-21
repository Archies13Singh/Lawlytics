import path from 'path';
import { VertexAI } from '@google-cloud/vertexai';

const project = "legal-doc-ai-468918";
const location = process.env.GCP_VERTEX_LOCATION || 'us-central1';
const modelId = process.env.VERTEX_MODEL_ID || 'gemini-1.5-flash';

const vertex = new VertexAI({ project, location });

export const legalModel = vertex.getGenerativeModel({
  model: modelId,
});
