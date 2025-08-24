"use client";

import { useState } from 'react';
import { auth } from '@/utils/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';

export default function SimpleTest() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testSimpleAuth = async () => {
    setLoading(true);
    setResult('');
    
    try {
      setResult('Testing simple authentication...\n');
      
      // Check if auth is available
      if (!auth) {
        setResult(prev => prev + '❌ Auth not available\n');
        return;
      }
      
      setResult(prev => prev + '✅ Auth available\n');
      
      // Check auth app
      const app = auth.app;
      setResult(prev => prev + `App name: ${app.name}\n`);
      setResult(prev => prev + `App options: ${JSON.stringify(app.options, null, 2)}\n`);
      
      // Try to create a user
      const testEmail = `simple-test-${Date.now()}@example.com`;
      const testPassword = 'password123';
      
      setResult(prev => prev + `Creating user: ${testEmail}\n`);
      
      const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
      setResult(prev => prev + `✅ User created: ${userCredential.user.uid}\n`);
      
    } catch (error: any) {
      console.error('Simple test error:', error);
      setResult(prev => prev + `❌ Error: ${error.message}\n`);
      setResult(prev => prev + `Code: ${error.code}\n`);
      setResult(prev => prev + `Full error: ${JSON.stringify(error, null, 2)}\n`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
      <h3 className="text-lg font-semibold mb-4">Simple Firebase Test</h3>
      
      <button
        onClick={testSimpleAuth}
        disabled={loading}
        className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-400 mb-4"
      >
        {loading ? 'Testing...' : 'Simple Test'}
      </button>
      
      {result && (
        <div className="bg-white p-4 rounded border font-mono text-sm whitespace-pre-wrap">
          {result}
        </div>
      )}
    </div>
  );
}
