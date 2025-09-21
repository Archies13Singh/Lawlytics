# Legal Document Chat - Feature Guide

This document explains how the end-to-end "chat over legal documents" feature works in this repository, how to configure it, and how to operate it.

## Overview

Users can:
- Upload a legal document (PDF/DOC/DOCX) to Google Cloud Storage.
- Process the document with Document AI to extract plain text.
- Chunk the text and generate Vertex AI embeddings (text-embedding-004).
- Store chunk texts and embeddings in Firestore for retrieval.
- Create a conversation and ask questions. Answers are produced by Vertex AI (`gemini-2.0-flash-001`) grounded in the retrieved chunks.

Key files and directories:
- `src/app/api/upload/route.ts` – uploads file to GCS with auth.
- `src/app/api/analyze/route.ts` – Document AI processing, chunking, JSON analysis, embeddings generation and storage (`documentChunks`).
- `src/app/api/conversations/route.ts` – create and list user conversations.
- `src/app/api/chat/route.ts` – retrieval-augmented chat over a document; stores messages per conversation.
- `src/utils/embeddings.ts` – Vertex AI embeddings REST utility using `google-auth-library`.
- `src/utils/similarity.ts` – cosine similarity + topK helper.
- `src/utils/vertexClient.ts` – Vertex AI generative client for chat/analysis model.
- `src/components/upload/FileUpload.tsx` – UI to upload and run analyze.
- `src/components/chat/ChatPane.tsx` – UI to create/select conversations and chat.
- `src/app/chat/page.tsx` – Page combining upload/analyze and chat.

## Data Model (Firestore)

Collections used:
- `documents/{documentId}`
  - Fields: `userId`, `fileName`, `fileUrl`, `gsUri`, `objectName`, `uploadedAt`, `status`, `fileSize`, `fileType`, `analysisResult`, `analyzedAt`.
- `documentChunks/{chunkId}`
  - Fields: `documentId`, `chunkIndex`, `text`, `embedding` (number[]), `createdAt`.
- `conversations/{conversationId}`
  - Fields: `userId`, `documentId`, `title`, `createdAt`, `updatedAt`.
  - Subcollection: `messages/{messageId}` with fields: `role` ('user'|'assistant'), `content`, `contexts?`, `createdAt`.

Indexes (recommended):
- `documentChunks` where `documentId` is filterable. (Single-field is sufficient.)
- `conversations` ordered by `createdAt` with `where userId ==`. (Composite index may be suggested automatically by Firestore console.)
- `conversations/{id}/messages` ordered by `createdAt`.

## Environment Variables

Required (existing + new):

Google Cloud / Vertex AI
- `GCP_PROJECT_ID=587742710924`
- `GCP_LOCATION=us` (for Document AI)
- `GCP_VERTEX_LOCATION=us-central1` (for Vertex)
- `VERTEX_MODEL_ID=gemini-2.0-flash-001`
- `VERTEX_EMBEDDING_MODEL_ID=text-embedding-004`  ← NEW
- `GCS_BUCKET_NAME=legal-doc-ai-uploads`
- `GCP_KEY_FILE=./upload-service.json`  ← NEW (path to the same service account JSON used elsewhere)

Document AI
- `GCP_PROCESSOR_ID=bc0db257f446ceff`

Firebase Admin (Server)
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID=lawlytics-abddd`
- `FIREBASE_CLIENT_EMAIL=...@lawlytics-abddd.iam.gserviceaccount.com`
- `FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"` (remember to keep newline escapes)
- `FIREBASE_DATABASE_URL=https://lawlytics-abddd.firebaseio.com`

Firebase (Client – NEXT_PUBLIC)
- `NEXT_PUBLIC_FIREBASE_API_KEY=...`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=lawlytics-abddd.firebaseapp.com`
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://lawlytics-abddd.firebaseio.com`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID=lawlytics-abddd`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=lawlytics-abddd.appspot.com`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...`
- `NEXT_PUBLIC_FIREBASE_APP_ID=...`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...` (optional)

Notes:
- `src/utils/gcsClient.ts` requires `GCP_KEY_FILE` and `GCS_BUCKET_NAME`.
- `src/utils/embeddings.ts` uses `GCP_KEY_FILE` for REST auth to Vertex.
- `src/utils/firebaseAdmin.ts` uses Admin credentials above.

## How It Works (Flow)

```mermaid
sequenceDiagram
  participant UI as Next.js UI
  participant API as Next.js API
  participant GCS as GCS Bucket
  participant DocAI as Document AI
  participant Vertex as Vertex AI
  participant FS as Firestore

  UI->>API: POST /api/upload (file + Firebase ID token)
  API->>GCS: Save file
  API-->>UI: gsUri, objectName, docId
  UI->>FS: Save documents/{docId} metadata

  UI->>API: POST /api/analyze { gsUri, documentId, language }
  API->>GCS: Download bytes
  API->>DocAI: processDocument(bytes)
  API-->>API: extracted text
  API->>Vertex: LLM JSON analysis per chunk
  API->>Vertex: Embeddings for chunks
  API->>FS: Store documentChunks (text + embedding)
  API->>FS: Update documents/{docId} status + analysisResult
  API-->>UI: summary

  UI->>API: POST /api/conversations { documentId }
  API->>FS: Create conversations/{id}
  API-->>UI: conversationId

  UI->>API: POST /api/chat { conversationId, documentId, question }
  API->>FS: Load top chunks for documentId
  API->>Vertex: generate answer with context
  API->>FS: Save messages
  API-->>UI: answer
```

## API Contracts

- `POST /api/upload`
  - Headers: `Authorization: Bearer <Firebase ID token>`
  - Body: `multipart/form-data` with `file`
  - Resp: `{ url, gsUri, objectName, docId, userId }`

- `POST /api/analyze`
  - Headers: `Authorization: Bearer <Firebase ID token>`
  - Body: `{ gcsUri: string, documentId: string, language?: string }`
  - Resp: `{ gcsUri, textLength, summary }`
  - Side effects:
    - Writes `documents/{documentId}` with `status`, `analysisResult`.
    - Writes `documentChunks` with embeddings for retrieval.

- `GET /api/conversations`
  - Headers: `Authorization`
  - Resp: `{ conversations: { id, userId, documentId, title, createdAt, updatedAt }[] }`

- `POST /api/conversations`
  - Headers: `Authorization`
  - Body: `{ documentId, title? }`
  - Resp: `{ id }`

- `GET /api/chat?conversationId=...`
  - Headers: `Authorization`
  - Resp: `{ messages: { id, role, content, createdAt }[] }`

- `POST /api/chat`
  - Headers: `Authorization`
  - Body: `{ conversationId, documentId, question, language? }`
  - Resp: `{ answer, contexts }`

## Running the UI

- Navigate to `/chat` to use the combined Upload/Analyze/Chat experience.
- Ensure you are signed in (Auth UI already present in the app).
- After uploading and analyzing a document, create a new conversation and ask questions.

## Security & Limits

- All API routes validate Firebase ID tokens via Admin SDK.
- File type and size checks are implemented in `api/upload`.
- Document classification heuristic + LLM check is used in `api/analyze` to reject non-legal documents.
- Embeddings retrieval is naive (client-side scoring on up to 200 chunks). For larger documents, consider a vector DB (e.g., Firestore with hashing, or a managed vector store) and pagination.

## Troubleshooting

- 401 Unauthorized: ensure client uses `user.getIdToken()` in requests.
- Missing `GCP_KEY_FILE` error: verify `.env` points to a valid service account JSON file path accessible at runtime.
- Firestore permission denied: update Firestore Rules to allow authenticated users to read their own `documents`, `conversations`, and subcollection `messages` while all server writes happen through Admin SDK.
- Vertex permissions: ensure the service account has Vertex AI User and Storage Object Admin roles.

## Future Enhancements

- Streamed responses for chat.
- Better retrieval (windowed chunks, reranking).
- Multi-doc conversations.
- Source citations UI with inline highlights.
