"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import Input from '@/components/ui/Input';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/utils/firebase';

interface Conversation {
  id: string;
  title: string;
  documentId: string;
  createdAt?: any;
  updatedAt?: any;
}

interface FireDocItem {
  id: string;
  fileName: string;
  status: string;
}

export default function ChatPane() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<FireDocItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState<boolean>(false);
  const [activeConv, setActiveConv] = useState<string>('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [messagesLoading, setMessagesLoading] = useState<boolean>(false);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  // Inline upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const canChat = useMemo(() => !!user && !!activeConv, [user, activeConv]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      setError('');
      try {
        // Prefer completed documents (have embeddings)
        const qDocs = query(
          collection(db, 'documents'),
          where('userId', '==', user.uid),
          where('status', '==', 'completed'),
          orderBy('uploadedAt', 'desc')
        );
        const snap = await getDocs(qDocs);
        const items: FireDocItem[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setDocuments(items);
      } catch (e: any) {
        // Fallback if index is missing for where+orderBy: drop orderBy
        console.warn('Primary docs query failed, attempting fallback without orderBy', e?.message || e);
        try {
          const qDocs2 = query(
            collection(db, 'documents'),
            where('userId', '==', user.uid),
            where('status', '==', 'completed')
          );
          const snap2 = await getDocs(qDocs2);
          const items2: FireDocItem[] = snap2.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
          setDocuments(items2);
        } catch (e2: any) {
          console.error('Fallback docs query also failed', e2);
          setError('Unable to load your documents. Please try uploading a document first or check Firestore rules/indexes.');
        }
      }
    })();
  }, [user]);

  async function deleteConversation(id: string) {
    if (!user) return;
    const ok = window.confirm('Delete this conversation? This cannot be undone.');
    if (!ok) return;
    const token = await user.getIdToken();
    const res = await fetch(`/api/conversations?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConv === id) {
        setActiveConv('');
        setSelectedDocId('');
        setMessages([{ role: 'assistant', content: 'Conversation deleted. Click + to upload and start a new chat.' }]);
      }
    } else {
      const j = await res.json().catch(() => ({} as any));
      alert(j?.error || 'Failed to delete');
    }
  }

  // Inline Upload & Analyze inside chat
  async function uploadAndAnalyzeInline() {
    if (!user) {
      setError('Please sign in to upload.');
      return;
    }
    if (!uploadFile) {
      setError('Select a file first.');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const token = await user.getIdToken();
      const fd = new FormData();
      fd.append('file', uploadFile);
      const upRes = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const upJson = await upRes.json();
      if (!upRes.ok) throw new Error(upJson?.error || 'Upload failed');

      // Analyze
      setAnalyzing(true);
      const anRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ gcsUri: upJson.gsUri, documentId: upJson.docId, language: 'en' }),
      });
      const anJson = await anRes.json();
      if (!anRes.ok) throw new Error(anJson?.error || 'Analyze failed');

      // Create conversation
      const convRes = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ documentId: upJson.docId }),
      });
      const convJson = await convRes.json();
      if (!convRes.ok) throw new Error(convJson?.error || 'Failed to create conversation');

      // Persist + greet
      localStorage.setItem('activeConversationId', convJson.id);
      localStorage.setItem('activeDocumentId', upJson.docId);
      setSelectedDocId(upJson.docId);
      setActiveConv(convJson.id);
      await loadMessages(convJson.id);
      const greetRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ conversationId: convJson.id, documentId: upJson.docId, greet: true }),
      });
      const greetJson = await greetRes.json();
      if (greetRes.ok) setMessages((prev) => [...prev, { role: 'assistant', content: greetJson.answer }]);
      await refreshConversations();
    } catch (e: any) {
      setError(e?.message || 'Upload & Analyze failed');
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  }

  // Auto-scroll to bottom when messages change
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Hidden file input to support '+' upload from input row
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  function openFilePicker() {
    fileInputRef.current?.click();
  }
  function startNewConversationUI() {
    // clear any persisted active ids
    localStorage.removeItem('activeConversationId');
    localStorage.removeItem('activeDocumentId');
    setSelectedDocId('');
    setActiveConv('');
    setMessages([{ role: 'assistant', content: 'Start a new chat by clicking the + button to upload a legal document.' }]);
  }
  async function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    if (f) {
      setUploadFile(f);
      await uploadAndAnalyzeInline();
      // clear the input so re-selecting the same file re-triggers change
      e.target.value = '';
    }
  }

  // Pick up auto-created conversation/document from localStorage
  useEffect(() => {
    (async () => {
      if (!user) return;
      const savedDoc = localStorage.getItem('activeDocumentId');
      const savedConv = localStorage.getItem('activeConversationId');
      if (savedDoc) setSelectedDocId(savedDoc);
      if (savedConv) {
        setActiveConv(savedConv);
        await loadMessages(savedConv);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function refreshConversations() {
    if (!user) return;
    setConversationsLoading(true);
    const token = await user.getIdToken();
    const res = await fetch('/api/conversations', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (res.ok) setConversations(json.conversations || []);
    setConversationsLoading(false);
  }

  useEffect(() => {
    refreshConversations();
  }, [user]);

  async function createConversation() {
    if (!user || !selectedDocId) return;
    const token = await user.getIdToken();
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ documentId: selectedDocId }),
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error || 'Failed to create conversation');
      return;
    }
    setActiveConv(json.id);
    refreshConversations();
    await loadMessages(json.id);
    // Send greeting from assistant to guide the user
    try {
      const greetRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ conversationId: json.id, documentId: selectedDocId, greet: true }),
      });
      const greetJson = await greetRes.json();
      if (greetRes.ok) {
        setMessages((prev) => [...prev, { role: 'assistant', content: greetJson.answer }]);
      } else if (greetJson?.error) {
        setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${greetJson.error}` }]);
      }
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${e?.message || 'Failed to greet'}` }]);
    }
  }

  async function loadMessages(convId: string) {
    if (!user) return;
    setMessagesLoading(true);
    const token = await user.getIdToken();
    const res = await fetch(`/api/chat?conversationId=${convId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (res.ok) {
      setMessages((json.messages || []).map((m: any) => ({ role: m.role, content: m.content })));
    }
    setMessagesLoading(false);
  }

  async function ask() {
    if (!user || !canChat || !question.trim()) return;
    setLoading(true);
    const token = await user.getIdToken();
    const userQuestion = question.trim();
    setQuestion('');
    setMessages((prev) => [...prev, { role: 'user', content: userQuestion }]);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ conversationId: activeConv, documentId: selectedDocId, question: userQuestion }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Chat failed');
      setMessages((prev) => [...prev, { role: 'assistant', content: json.answer }]);
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[calc(100vh-var(--nav-height))]">
      <div className="md:col-span-1 space-y-4 h-full">
        <div className="p-3 border rounded space-y-2 h-[calc(100vh-100px)] flex flex-col">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Conversations</div>
            <Button onClick={startNewConversationUI} disabled={uploading || analyzing}>
              + New
            </Button>
          </div>
          <div className="flex-1 overflow-auto space-y-1 text-sm">
            {conversationsLoading && (
              <div className="space-y-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            )}
            {!conversationsLoading && conversations.map((c) => (
              <div
                key={c.id}
                className={`p-2 rounded border cursor-pointer ${activeConv === c.id ? 'bg-blue-50' : 'bg-white'}`}
                onClick={() => { setActiveConv(c.id); setSelectedDocId(c.documentId); loadMessages(c.id); }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium truncate">{c.title || 'Legal Chat'}</div>
                  <button
                    className="text-xs text-red-600 hover:underline"
                    onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                  >
                    Delete
                  </button>
                </div>
                <div className="text-xs text-gray-500 truncate">doc: {c.documentId}</div>
              </div>
            ))}
            {!conversationsLoading && conversations.length === 0 && (
              <div className="text-gray-500 text-xs">No conversations yet. Click + to upload and start.</div>
            )}
          </div>
        </div>
      </div>
      <div className="md:col-span-3 flex flex-col border rounded h-[calc(100vh-100px)]">
        {(uploading || analyzing) && (
          <div className="px-4 py-2 text-sm bg-blue-50 border-b">
            {uploading ? 'Uploading your document…' : 'Analyzing your document (legal check, text extraction, embeddings)…'}
          </div>
        )}
        <div className="flex-1 p-4 space-y-3 overflow-auto">
          {messages.length === 0 && (
            <div className="text-gray-500 text-sm">Start by clicking the + button to upload a legal document, or select a previous conversation.</div>
          )}
          {messagesLoading && (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-20" />
            </div>
          )}
          {!messagesLoading && messages.map((m, idx) => (
            <div key={idx} className={`p-3 rounded ${m.role === 'user' ? 'bg-gray-100' : 'bg-green-50'}`}>
              <div className="text-xs text-gray-500 mb-1">{m.role}</div>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-3 border-t flex gap-2 items-center">
          <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={onFilePicked} />
          <Button onClick={openFilePicker} disabled={uploading || analyzing}>
            +
          </Button>
          <Input
            placeholder="Ask a question about the document..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') ask(); }}
          />
          <Button onClick={ask} disabled={!canChat || loading || !question.trim()} loading={loading}>Send</Button>
        </div>
      </div>
    </div>
  );
}
