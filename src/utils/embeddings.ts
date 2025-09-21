import path from 'path';
import { GoogleAuth } from 'google-auth-library';

const project = process.env.GCP_PROJECT_ID || '587742710924';
const location = process.env.GCP_VERTEX_LOCATION || 'us-central1';
// Use stable prediction-style embedding model by default
const embeddingModelId = process.env.VERTEX_EMBEDDING_MODEL_ID || 'textembedding-gecko@003';

const keyFilename = process.env.GCP_KEY_FILE || path.join(process.cwd(), 'upload-service.json');

const BASE_URL = `https://${location}-aiplatform.googleapis.com/v1`;
const MODEL_PATH = `/projects/${project}/locations/${location}/publishers/google/models/${embeddingModelId}`;

async function getAccessToken(): Promise<string> {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    keyFilename,
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token || !token.token) throw new Error('Failed to obtain access token for Vertex AI');
  return token.token as string;
}

export async function embedText(input: string): Promise<number[]> {
  try {
    // Prediction-style embeddings endpoint
    const url = `${BASE_URL}${MODEL_PATH}:predict`;
    const accessToken = await getAccessToken();
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ instances: [{ content: input }] }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Embedding request failed (${resp.status}). URL=${url}. Body=${text}`);
    }
    const json = await resp.json();
    const values = json?.predictions?.[0]?.embeddings?.values || json?.predictions?.[0]?.values;
    if (!values) throw new Error('No embedding values in response');
    return values as number[];
  } catch (e: any) {
    console.error('embedText error:', e?.message || e);
    throw e;
  }
}

export async function embedMany(inputs: string[]): Promise<number[][]> {
  const out: number[][] = [];
  const batchSize = 16;
  const url = `${BASE_URL}${MODEL_PATH}:predict`;
  const accessToken = await getAccessToken();
  for (let i = 0; i < inputs.length; i += batchSize) {
    const batch = inputs.slice(i, i + batchSize);
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ instances: batch.map((text) => ({ content: text })) }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Batch embedding failed (${resp.status}). URL=${url}. Body=${text}`);
      }
      const json = await resp.json();
      const preds = json?.predictions as any[];
      if (!Array.isArray(preds)) throw new Error('Invalid batch embeddings response');
      for (const p of preds) {
        const v = p?.embeddings?.values || p?.values;
        if (!v) throw new Error('Missing embedding values in a prediction');
        out.push(v as number[]);
      }
    } catch (e: any) {
      console.error('embedMany batch error:', e?.message || e);
      throw e;
    }
  }
  return out;
}
