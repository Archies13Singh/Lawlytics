"use client";

import { useState } from 'react';
import { auth, db } from '@/utils/firebase';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc, setDoc, addDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';

export default function FirebaseTest() {
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testFirebaseConnection = async () => {
    setLoading(true);
    setTestResult('');
    
    try {
      // Test 1: Check if Firebase is initialized
      setTestResult('Testing Firebase initialization...\n');
      
      if (!auth || !db) {
        setTestResult(prev => prev + '❌ Firebase not initialized\n');
        return;
      }
      
      setTestResult(prev => prev + '✅ Firebase initialized\n');
      
      // Test 2: Check environment variables with more detail
      setTestResult(prev => prev + 'Checking environment variables...\n');
      const config = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };
      
      setTestResult(prev => prev + `API Key: ${config.apiKey ? '✅ Set' : '❌ Missing'} (${config.apiKey?.substring(0, 10)}...)\n`);
      setTestResult(prev => prev + `Auth Domain: ${config.authDomain ? '✅ Set' : '❌ Missing'} (${config.authDomain})\n`);
      setTestResult(prev => prev + `Project ID: ${config.projectId ? '✅ Set' : '❌ Missing'} (${config.projectId})\n`);
      setTestResult(prev => prev + `Storage Bucket: ${config.storageBucket ? '✅ Set' : '❌ Missing'} (${config.storageBucket})\n`);
      setTestResult(prev => prev + `Sender ID: ${config.messagingSenderId ? '✅ Set' : '❌ Missing'} (${config.messagingSenderId})\n`);
      setTestResult(prev => prev + `App ID: ${config.appId ? '✅ Set' : '❌ Missing'} (${config.appId})\n`);
      
      // Test 3: Check Firebase app configuration
      setTestResult(prev => prev + '\nChecking Firebase app config...\n');
      const app = auth.app;
      const appOptions = app.options;
      setTestResult(prev => prev + `Firebase App Name: ${app.name}\n`);
      setTestResult(prev => prev + `Firebase App Options: ${JSON.stringify(appOptions, null, 2)}\n`);
      
      // Test 4: Check if the app is properly configured
      setTestResult(prev => prev + '\nValidating app configuration...\n');
      if (appOptions.apiKey !== config.apiKey) {
        setTestResult(prev => prev + `❌ API Key mismatch! Expected: ${config.apiKey?.substring(0, 10)}..., Got: ${appOptions.apiKey?.substring(0, 10)}...\n`);
        return;
      }
      if (appOptions.projectId !== config.projectId) {
        setTestResult(prev => prev + `❌ Project ID mismatch! Expected: ${config.projectId}, Got: ${appOptions.projectId}\n`);
        return;
      }
      setTestResult(prev => prev + '✅ App configuration matches environment variables\n');
      
      // Test 5: Check project-specific configuration
      setTestResult(prev => prev + '\nChecking project configuration...\n');
      setTestResult(prev => prev + `Current project ID: ${appOptions.projectId}\n`);
      setTestResult(prev => prev + `Current auth domain: ${appOptions.authDomain}\n`);
      
      // Test 6: Verify the configuration looks correct
      setTestResult(prev => prev + '\nVerifying configuration format...\n');
      if (!appOptions.projectId || appOptions.projectId.includes('firebaseapp.com')) {
        setTestResult(prev => prev + '❌ Project ID format is incorrect\n');
        return;
      }
      if (!appOptions.authDomain || !appOptions.authDomain.endsWith('.firebaseapp.com')) {
        setTestResult(prev => prev + '❌ Auth domain format is incorrect\n');
        return;
      }
      setTestResult(prev => prev + '✅ Configuration format looks correct\n');
      
      // Test 7: Try to create a test user
      setTestResult(prev => prev + '\nTesting user creation...\n');
      const testEmail = `test-${Date.now()}@example.com`;
      const testPassword = 'testpassword123';
      
      setTestResult(prev => prev + `Test email: ${testEmail}\n`);
      setTestResult(prev => prev + `Test password: ${testPassword}\n`);
      
      const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
      setTestResult(prev => prev + `✅ Test user created: ${userCredential.user.uid}\n`);
      
      // Test 8: Try to write to Firestore
      setTestResult(prev => prev + 'Testing Firestore write...\n');
      const testDoc = await addDoc(collection(db, 'test'), {
        test: true,
        timestamp: new Date(),
        userId: userCredential.user.uid
      });
      setTestResult(prev => prev + `✅ Test document written: ${testDoc.id}\n`);
      
      // Test 9: Try to read from Firestore
      setTestResult(prev => prev + 'Testing Firestore read...\n');
      const querySnapshot = await getDocs(collection(db, 'test'));
      setTestResult(prev => prev + `✅ Test documents read: ${querySnapshot.size} documents\n`);
      
      // Test 10: Test documents collection write
      setTestResult(prev => prev + '\nTesting documents collection write...\n');
      const testDocumentId = `test-doc-${Date.now()}`;
      const documentRef = doc(db, 'documents', testDocumentId);
      
      try {
        await setDoc(documentRef, {
          userId: userCredential.user.uid,
          fileName: 'test-document.pdf',
          fileUrl: 'https://example.com/test.pdf',
          gsUri: 'gs://test-bucket/test.pdf',
          objectName: 'test.pdf',
          uploadedAt: new Date(),
          status: 'test',
          fileSize: 1024,
          fileType: 'application/pdf',
        });
        setTestResult(prev => prev + `✅ Test document saved to documents collection: ${testDocumentId}\n`);
        
        // Test 11: Try to read the document back
        setTestResult(prev => prev + 'Testing document read back...\n');
        const readDoc = await getDocs(collection(db, 'documents'));
        setTestResult(prev => prev + `✅ Documents collection read: ${readDoc.size} documents found\n`);
        
        // Test 12: Clean up test document
        setTestResult(prev => prev + 'Cleaning up test document...\n');
        await deleteDoc(documentRef);
        setTestResult(prev => prev + `✅ Test document cleaned up\n`);
        
      } catch (docError: any) {
        setTestResult(prev => prev + `❌ Failed to write to documents collection: ${docError.message}\n`);
        setTestResult(prev => prev + `Error code: ${docError.code}\n`);
        if (docError.code === 'permission-denied') {
          setTestResult(prev => prev + '🔍 This suggests Firestore security rules are blocking access\n');
        }
        throw docError; // Re-throw to stop the test
      }
      
      setTestResult(prev => prev + '\n🎉 All tests passed! Firebase is working correctly.\n');
      
    } catch (error: any) {
      console.error('Firebase test error:', error);
      setTestResult(prev => prev + `❌ Error: ${error.message}\n`);
      setTestResult(prev => prev + `Error code: ${error.code}\n`);
      
      // Additional error details
      if (error.code === 'auth/configuration-not-found') {
        setTestResult(prev => prev + '\n🔍 This error usually means:\n');
        setTestResult(prev => prev + '1. Wrong project ID in environment variables\n');
        setTestResult(prev => prev + '2. Firebase project doesn\'t exist\n');
        setTestResult(prev => prev + '3. Web app not created in Firebase Console\n');
        setTestResult(prev => prev + '4. Authentication not enabled\n');
        setTestResult(prev => prev + '5. Configuration mismatch between env vars and Firebase app\n');
        setTestResult(prev => prev + '6. Firebase project is in a different region\n');
        setTestResult(prev => prev + '7. Firebase project is disabled or suspended\n');
        setTestResult(prev => prev + '8. Environment variables not loaded correctly\n');
      }
      
      if (error.code === 'permission-denied') {
        setTestResult(prev => prev + '\n🔍 Permission denied error means:\n');
        setTestResult(prev => prev + '1. Firestore security rules are too restrictive\n');
        setTestResult(prev => prev + '2. User is not authenticated\n');
        setTestResult(prev => prev + '3. Collection or document access is denied\n');
      }
      
      setTestResult(prev => prev + `\nFull error object: ${JSON.stringify(error, null, 2)}\n`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">Firebase Connection Test</h3>
      
      <Button
        onClick={testFirebaseConnection}
        disabled={loading}
        loading={loading}
        className="mb-4"
      >
        Test Firebase Connection
      </Button>
      
      {testResult && (
        <div className="bg-white p-4 rounded border font-mono text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
          {testResult}
        </div>
      )}
    </div>
  );
}

// Simple Button component for this test
function Button({ children, onClick, disabled, loading, className = '' }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 ${className}`}
    >
      {loading ? 'Testing...' : children}
    </button>
  );
}
