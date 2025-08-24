"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/utils/firebase';
import Button from '../ui/Button';
import Loader from '../ui/Loader';

interface DocumentRecord {
  id: string;
  fileName: string;
  fileUrl: string;
  gsUri: string;
  uploadedAt: Date;
  analyzedAt?: Date;
  analysisResult?: any;
  status: 'uploaded' | 'analyzing' | 'completed' | 'failed';
}

export default function DocumentHistory() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  const fetchDocuments = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const q = query(
        collection(db, 'documents'),
        where('userId', '==', user.uid),
        orderBy('uploadedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const docs: DocumentRecord[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        docs.push({
          id: doc.id,
          fileName: data.fileName,
          fileUrl: data.fileUrl,
          gsUri: data.gsUri,
          uploadedAt: data.uploadedAt.toDate(),
          analyzedAt: data.analyzedAt?.toDate(),
          analysisResult: data.analysisResult,
          status: data.status,
        });
      });
      
      setDocuments(docs);
    } catch (err: any) {
      setError('Failed to fetch documents: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await deleteDoc(doc(db, 'documents', docId));
      setDocuments(docs => docs.filter(doc => doc.id !== docId));
    } catch (err: any) {
      setError('Failed to delete document: ' + err.message);
    }
  };

  const handleReanalyze = async (document: DocumentRecord) => {
    try {
      // Get the current user's ID token
      const token = await user?.getIdToken();
      
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          gcsUri: document.gsUri,
          documentId: document.id 
        }),
      });
      
      if (res.ok) {
        // Refresh documents to show updated status
        await fetchDocuments();
      } else {
        const data = await res.json();
        setError('Reanalysis failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      setError('Reanalysis failed: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
        {error}
        <button
          onClick={() => setError('')}
          className="ml-2 text-red-500 hover:text-red-700"
        >
          ×
        </button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No documents found. Upload your first document to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Document History</h2>
      
      <div className="grid gap-4">
        {documents.map((document) => (
          <div
            key={document.id}
            className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">{document.fileName}</h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                  <div>
                    <span className="font-medium">Uploaded:</span> {document.uploadedAt.toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <span className={`ml-1 px-2 py-1 rounded-full text-xs font-medium ${
                      document.status === 'completed' ? 'bg-green-100 text-green-800' :
                      document.status === 'analyzing' ? 'bg-yellow-100 text-yellow-800' :
                      document.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {document.status}
                    </span>
                  </div>
                </div>

                {document.analyzedAt && (
                  <div className="text-sm text-gray-600 mb-3">
                    <span className="font-medium">Analyzed:</span> {document.analyzedAt.toLocaleDateString()}
                  </div>
                )}

                {document.analysisResult && (
                  <div className="mb-3">
                    <h4 className="font-medium text-sm mb-1">Summary:</h4>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {document.analysisResult.short_summary}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 ml-4">
                <Button
                  onClick={() => window.open(document.fileUrl, '_blank')}
                  size="sm"
                  variant="outline"
                >
                  View
                </Button>
                
                {document.status === 'completed' && (
                  <Button
                    onClick={() => handleReanalyze(document)}
                    size="sm"
                    variant="outline"
                  >
                    Reanalyze
                  </Button>
                )}
                
                <Button
                  onClick={() => handleDelete(document.id)}
                  size="sm"
                  variant="destructive"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
