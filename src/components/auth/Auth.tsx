"use client";

import { useState } from 'react';
import LoginForm from './LoginForm';
import SignUpForm from './SignUpForm';


export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showTest, setShowTest] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Lawlytics
          </h1>
          <p className="text-center text-gray-600">
            Legal Document Analysis Platform
          </p>
        </div>
        
        {isLogin ? (
          <LoginForm onSwitchToSignUp={() => setIsLogin(false)} />
        ) : (
          <SignUpForm onSwitchToLogin={() => setIsLogin(true)} />
        )}
      </div>
    </div>
  );
}
