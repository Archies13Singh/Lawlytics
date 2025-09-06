"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/utils/firebase';

interface UserProfile {
  uid: string;
  email: string;
  displayName?: string | null;
  phone?: string;
  userRole?: string;
  simplificationStyle?: string;
  outputFormat?: string;
  createdAt: Date;
  lastLoginAt: Date;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user ? 'User logged in' : 'No user');
      setUser(user);
      if (user) {
        try {
          console.log('Loading user profile for:', user.uid);
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          let existingData: any = {};
          if (userDoc.exists()) {
            existingData = userDoc.data();
          }

          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: existingData.displayName || user.displayName || null,
            phone: existingData.phone,
            userRole: existingData.userRole,
            simplificationStyle: existingData.simplificationStyle,
            outputFormat: existingData.outputFormat,
            createdAt: existingData.createdAt ? new Date(existingData.createdAt.seconds * 1000) : new Date(),
            lastLoginAt: new Date(),
          };

          // Update Firestore with last login time
          await setDoc(userDocRef, {
            lastLoginAt: new Date(),
          }, { merge: true });

          setUserProfile(newProfile);
          console.log('User profile loaded successfully');
        } catch (error) {
          console.error('Error loading user profile:', error);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting sign in for:', email);
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('Sign in successful:', result.user.uid);
      
      // Update last login time
      if (result.user) {
        await setDoc(doc(db, 'users', result.user.uid), {
          lastLoginAt: new Date(),
        }, { merge: true });
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      console.log('Attempting sign up for:', email);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Sign up successful:', result.user.uid);
      
      const newProfile: UserProfile = {
        uid: result.user.uid,
        email: result.user.email || '',
        displayName,
        phone: undefined,
        userRole: undefined,
        simplificationStyle: undefined,
        outputFormat: undefined,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };
      await setDoc(doc(db, 'users', result.user.uid), newProfile);
      console.log('User profile created successfully');
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out user');
      await signOut(auth);
      console.log('Logout successful');
    } catch (error: any) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      console.log('Sending password reset to:', email);
      await sendPasswordResetEmail(auth, email);
      console.log('Password reset email sent');
    } catch (error: any) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in');
    try {
      console.log('Updating user profile:', data);
      await setDoc(doc(db, 'users', user.uid), data, { merge: true });
      setUserProfile(prev => prev ? { ...prev, ...data } : null);
      console.log('User profile updated successfully');
    } catch (error: any) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    logout,
    resetPassword,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
