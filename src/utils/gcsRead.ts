import { bucket } from '@/utils/gcsClient';

export async function downloadGcsObject(objectName: string): Promise<Buffer> {
  const file = bucket.file(objectName);
  const [contents] = await file.download();
  return contents;
}

// Given a GCS URI like gs://bucket/path/to/file.json, download and parse as JSON
type DocAIExtracted = any; // You can type this more strictly if you want
export async function getDocumentFromGCS(gcsUri: string): Promise<DocAIExtracted> {
  // Remove gs:// prefix and bucket name
  const match = gcsUri.match(/^gs:\/\/([^\/]+)\/(.+)$/);
  if (!match) throw new Error('Invalid GCS URI: ' + gcsUri);
  const objectName = match[2];
  const buffer = await downloadGcsObject(objectName);
  const json = JSON.parse(buffer.toString('utf8'));
  return json;
}
