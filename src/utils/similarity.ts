export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('Vector length mismatch');
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export function topKSimilar(
  query: number[],
  vectors: { id: string; vector: number[]; meta?: any }[],
  k: number
) {
  const scored = vectors.map((v) => ({ ...v, score: cosineSimilarity(query, v.vector) }));
  scored.sort((x, y) => y.score - x.score);
  return scored.slice(0, k);
}
