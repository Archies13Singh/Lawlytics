"use client";

import { useAuth } from "@/contexts/AuthContext";
import FileUpload from "@/components/upload/FileUpload";
import DocumentHistory from "@/components/history/DocumentHistory";
import UserProfile from "@/components/auth/UserProfile";
import Auth from "@/components/auth/Auth";
import Loader from "@/components/ui/Loader";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h1 className="text-2xl font-bold mb-4">📄 Legal Doc AI - Upload</h1>
          <FileUpload />
        </div>
        <div className="space-y-6">
          <UserProfile />
          <DocumentHistory />
        </div>
      </div>
    </main>
  );
}
