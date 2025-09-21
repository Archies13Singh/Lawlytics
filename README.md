# Lawlytics – Legal Document Chat

Lawlytics is a Next.js app that lets users upload legal documents and chat with them using RAG on Google Cloud (Document AI + Vertex AI) with Firebase for auth and storage.

- Full documentation: see `docs/README.md`
- Feature deep-dive: see `docs/LEGAL_CHAT.md`

## Quickstart

1) Install dependencies
```bash
npm install
```

2) Configure environment
- Copy your `.env`/`.env.local` with Google Cloud and Firebase values.
- Ensure these exist: `GCP_PROJECT_ID`, `GCP_LOCATION`, `GCP_VERTEX_LOCATION`, `VERTEX_MODEL_ID`, `VERTEX_EMBEDDING_MODEL_ID`, `GCS_BUCKET_NAME`, `GCP_KEY_FILE`, `GCP_PROCESSOR_ID`, and Firebase Admin + NEXT_PUBLIC client vars.

3) Run
```bash
npm run dev
# http://localhost:3000
```

Navigate to `/chat` to upload a document, analyze it, and start chatting.

## Scripts
- `npm run dev` – start dev server
- `npm run build` – build
- `npm run start` – run production
- `npm run lint` – lint

## Tech
Next.js 15, React 19, Tailwind 4, Document AI, Vertex AI, Firebase, Firestore.

