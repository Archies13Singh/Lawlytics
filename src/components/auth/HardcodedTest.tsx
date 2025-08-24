"use client";

import { useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

export default function HardcodedTest() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testHardcodedConfig = async () => {
    setLoading(true);
    setResult('');
    
    try {
      setResult('Testing with hardcoded configuration...\n');
      
      // Use the exact configuration from Firebase Console
      const firebaseConfig = {
        apiKey: "AIzaSyAy_4Six1pWQxzbWsLh6l6NtdgDe-C3zP0",
        authDomain: "lawlytics-abddd.firebaseapp.com",
        databaseURL: "https://lawlytics-abddd-default-rtdb.firebaseio.com",
        projectId: "lawlytics-abddd",
        storageBucket: "lawlytics-abddd.firebasestorage.app",
        messagingSenderId: "1090966792015",
        appId: "1:1090966792015:web:ac2c9a261909ab1bc0073a",
        measurementId: "G-H5XZY8RBQ2"
      };
      
      setResult(prev => prev + '✅ Configuration loaded\n');
      setResult(prev => prev + `Project ID: ${firebaseConfig.projectId}\n`);
      setResult(prev => prev + `Auth Domain: ${firebaseConfig.authDomain}\n`);
      
      // Initialize Firebase with hardcoded config
      const app = initializeApp(firebaseConfig);
      const auth = getAuth(app);
      
      setResult(prev => prev + '✅ Firebase initialized\n');
      
      // Try to create a user
      const testEmail = `hardcoded-test-${Date.now()}@example.com`;
      const testPassword = 'password123';
      
      setResult(prev => prev + `Creating user: ${testEmail}\n`);
      
      const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
      setResult(prev => prev + `✅ User created: ${userCredential.user.uid}\n`);
      
      setResult(prev => prev + '\n🎉 Hardcoded configuration works!\n');
      setResult(prev => prev + 'The issue is with environment variables or the main Firebase config.\n');
      
    } catch (error: any) {
      console.error('Hardcoded test error:', error);
      setResult(prev => prev + `❌ Error: ${error.message}\n`);
      setResult(prev => prev + `Code: ${error.code}\n`);
      setResult(prev => prev + `Full error: ${JSON.stringify(error, null, 2)}\n`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
      <h3 className="text-lg font-semibold mb-4">Hardcoded Configuration Test</h3>
      
      <button
        onClick={testHardcodedConfig}
        disabled={loading}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 mb-4"
      >
        {loading ? 'Testing...' : 'Test Hardcoded Config'}
      </button>
      
      {result && (
        <div className="bg-white p-4 rounded border font-mono text-sm whitespace-pre-wrap">
          {result}
        </div>
      )}
    </div>
  );
}
