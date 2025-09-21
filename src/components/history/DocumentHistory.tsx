"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/utils/firebase";
import Button from "../ui/Button";
import Loader from "../ui/Loader";
import DocumentDetailModal from "./DocumentDetailModal";

interface DocumentRecord {
  id: string;
  fileName: string;
  fileUrl: string;
  gsUri: string;
  uploadedAt: Date;
  analyzedAt?: Date;
  analysisResult?: any;
  status: "uploaded" | "analyzing" | "completed" | "failed";
}

export default function DocumentHistory() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDocument, setSelectedDocument] =
    useState<DocumentRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(3);

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  const fetchDocuments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Use a simpler query that doesn't require composite index
      const q = query(
        collection(db, "documents"),
        where("userId", "==", user.uid)
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

      // Sort documents by uploadedAt in descending order (most recent first)
      docs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

      setDocuments(docs);
      setVisibleCount(3); // Reset to show only 3 initially
    } catch (err: any) {
      setError(t("analyzeError") + ": " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentClick = (document: DocumentRecord) => {
    setSelectedDocument(document);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setSelectedDocument(null);
    setIsModalOpen(false);
  };

  const handleDownload = async (document: DocumentRecord) => {
    try {
      const response = await fetch(document.fileUrl);
      if (!response.ok) {
        throw new Error("Failed to download file");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = document.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError(t("uploadFailed") + ": " + (error as Error).message);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm(t("delete") + "?")) return;

    try {
      await deleteDoc(doc(db, "documents", docId));
      setDocuments((docs) => docs.filter((doc) => doc.id !== docId));
    } catch (err: any) {
      setError("Failed to delete document: " + err.message);
    }
  };

  const handleReanalyze = async (document: DocumentRecord) => {
    try {
      // Get the current user's ID token
      const token = await user?.getIdToken();

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gcsUri: document.gsUri,
          documentId: document.id,
          language: language,
        }),
      });

      if (res.ok) {
        // Refresh documents to show updated status
        await fetchDocuments();
      } else {
        const data = await res.json();
        setError("Reanalysis failed: " + (data.error || "Unknown error"));
      }
    } catch (err: any) {
      setError("Reanalysis failed: " + err.message);
    }
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 3, documents.length));
  };

  if (loading) {
    return (
      <div className="space-y-4 text-primary">
        <h2 className="text-xl font-semibold mb-2">{t("documentHistory")}</h2>
        <div className="surface rounded-lg overflow-hidden max-h-96">
          <div className="grid gap-3 p-4">
            <div className="panel p-3 rounded-lg shadow-sm animate-pulse">
              <div className="h-4 w-2/3 bg-gray-200 rounded mb-3" />
              <div className="flex gap-2">
                <div className="h-8 w-24 bg-gray-200 rounded" />
                <div className="h-8 w-24 bg-gray-200 rounded" />
                <div className="h-8 w-20 bg-gray-200 rounded" />
              </div>
            </div>
            <div className="panel p-3 rounded-lg shadow-sm animate-pulse">
              <div className="h-4 w-1/2 bg-gray-200 rounded mb-3" />
              <div className="flex gap-2">
                <div className="h-8 w-24 bg-gray-200 rounded" />
                <div className="h-8 w-24 bg-gray-200 rounded" />
                <div className="h-8 w-20 bg-gray-200 rounded" />
              </div>
            </div>
            <div className="panel p-3 rounded-lg shadow-sm animate-pulse">
              <div className="h-4 w-1/3 bg-gray-200 rounded mb-3" />
              <div className="flex gap-2">
                <div className="h-8 w-24 bg-gray-200 rounded" />
                <div className="h-8 w-24 bg-gray-200 rounded" />
                <div className="h-8 w-20 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
        {error}
        <button
          onClick={() => setError("")}
          className="ml-2 text-red-500 hover:text-red-700"
          aria-label={t("close")}
        >
          ×
        </button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>{t("noDocuments")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-primary">
      <h2 className="text-xl font-semibold mb-2">{t("documentHistory")}</h2>

      <div className="surface rounded-lg overflow-hidden max-h-96">
        <div className="grid gap-3 p-4">
          {documents.slice(0, visibleCount).map((document) => (
            <div
              key={document.id}
              className="panel p-3 rounded-lg shadow-sm"
            >
              <div className="mb-2 min-w-0">
                <h3 className="font-semibold text-sm" title={document.fileName}>
                  {document.fileName.length > 40
                    ? `${document.fileName.slice(0, 40)}...`
                    : document.fileName}
                </h3>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDocumentClick(document);
                  }}
                  size="sm"
                  variant="outline"
                  className="text-xs px-3 py-1 flex-shrink-0"
                >
                  {t("viewDetails")}
                </Button>

                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(document.fileUrl, "_blank");
                  }}
                  size="sm"
                  variant="outline"
                  className="text-xs px-3 py-1 flex-shrink-0"
                >
                  {t("viewPDF")}
                </Button>

                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(document.id);
                  }}
                  size="sm"
                  variant="destructive"
                  className="text-xs px-3 py-1 flex-shrink-0"
                >
                  {t("delete")}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {visibleCount < documents.length && (
          <div className="p-4 pt-0">
            <Button
              onClick={handleLoadMore}
              size="sm"
              variant="outline"
              className="w-full text-sm"
            >
              {t("loadMore")} ({documents.length - visibleCount} {t("remaining")})
            </Button>
          </div>
        )}
      </div>

      <DocumentDetailModal
        document={selectedDocument}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onDownload={handleDownload}
      />
    </div>
  );
}
