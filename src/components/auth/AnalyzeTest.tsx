"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function AnalyzeTest() {
  const { user } = useAuth();
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testAnalyzeAPI = async () => {
    if (!user) {
      setResult('❌ No user logged in');
      return;
    }

    setLoading(true);
    setResult('');
    
    try {
      setResult('Testing analyze API...\n');
      
      // Get the current user's ID token
      const token = await user.getIdToken();
      setResult(prev => prev + '✅ Got user token\n');
      
      // Test with a sample GCS URI
      const testGcsUri = 'gs://legal-doc-ai-uploads/test-document.pdf';
      const testDocumentId = 'test-analyze-123';
      
      setResult(prev => prev + `Testing with GCS URI: ${testGcsUri}\n`);
      setResult(prev => prev + `Document ID: ${testDocumentId}\n`);
      
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          gcsUri: testGcsUri,
          documentId: testDocumentId 
        }),
      });
      
      setResult(prev => prev + `Response status: ${res.status}\n`);
      setResult(prev => prev + `Response headers: ${JSON.stringify(Object.fromEntries(res.headers.entries()))}\n`);
      
      if (res.ok) {
        const data = await res.json();
        setResult(prev => prev + `✅ Analysis successful!\n`);
        setResult(prev => prev + `Summary: ${data.summary?.short_summary?.substring(0, 100)}...\n`);
      } else {
        const errorText = await res.text();
        setResult(prev => prev + `❌ Analysis failed: ${res.status} ${res.statusText}\n`);
        setResult(prev => prev + `Error response: ${errorText}\n`);
      }
      
    } catch (error: any) {
      console.error('Analyze test error:', error);
      setResult(prev => prev + `❌ Error: ${error.message}\n`);
      setResult(prev => prev + `Full error: ${JSON.stringify(error, null, 2)}\n`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
      <h3 className="text-lg font-semibold mb-4">Analyze API Test</h3>
      
      <button
        onClick={testAnalyzeAPI}
        disabled={loading || !user}
        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 mb-4"
      >
        {loading ? 'Testing...' : 'Test Analyze API'}
      </button>
      
      {result && (
        <div className="bg-white p-4 rounded border font-mono text-sm whitespace-pre-wrap">
          {result}
        </div>
      )}
    </div>
  );
}
