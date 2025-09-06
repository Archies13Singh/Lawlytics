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
    <main className="p-4 md:p-6 max-w-7xl mx-auto" style={{ backgroundColor: '#dad7cd', minHeight: '100vh', color: '#344e41' }}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        <div className="lg:col-span-2 p-4 md:p-6 rounded-lg shadow-lg" style={{ backgroundColor: '#A8BCA1' }}>
          <h1 className="text-2xl md:text-3xl font-extrabold mb-4 md:mb-6" style={{ color: '#3a5a40' }}>📄 Legal Doc AI - Upload</h1>
          <FileUpload />
        </div>
        <div className="space-y-4 md:space-y-6">
          <DocumentHistory />
        </div>
      </div>
    </main>
  );
}
