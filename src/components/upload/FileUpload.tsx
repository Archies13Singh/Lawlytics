"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/hooks/useTranslation";
import { translations } from "@/utils/translations";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/utils/firebase";
import Button from "../ui/Button";
import Input from "../ui/Input";
import UploadStatus from "./UploadStatus";

export default function FileUpload() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<any | null>(null);

  const handleUpload = async () => {
      if (!user) {
        setError(t("signInToUpload"));
        return;
      }

      if (!file) {
        setError(t("selectFileFirst"));
        return;
      }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Get the current user's ID token
      const token = await user.getIdToken();

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // Don't set Content-Type for FormData - browser will set it automatically
        },
        body: formData,
      });

      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON response:", text);
        setError(
          `Upload failed: Server returned ${res.status} - ${res.statusText}`
        );
        return;
      }

      const data = await res.json();

      if (res.ok) {
        setFileUrl(data.url);
        localStorage.setItem("gsUri", data.gsUri);

        console.log("Upload successful, saving to Firebase...");
        console.log("Document data:", {
          docId: data.docId,
          fileName: file.name,
          fileUrl: data.url,
          gsUri: data.gsUri,
          userId: user.uid,
        });

        try {
          // Save document metadata to Firebase
          const documentRef = doc(db, "documents", data.docId);

          const documentData = {
            userId: user.uid,
            fileName: file.name,
            fileUrl: data.url,
            gsUri: data.gsUri,
            objectName: data.objectName,
            uploadedAt: new Date(),
            status: "uploaded",
            fileSize: file.size,
            fileType: file.type,
          };

          console.log("Attempting to save document data:", documentData);

          await setDoc(documentRef, documentData);

          console.log("✅ Document saved to Firebase successfully");
        } catch (firebaseError) {
          console.error(
            "❌ Failed to save document to Firebase:",
            firebaseError
          );

          if (firebaseError instanceof Error) {
            if (firebaseError.message.includes("permission")) {
              setError(
                "Upload successful but failed to save metadata: Permission denied. Check Firestore security rules."
              );
            } else if (firebaseError.message.includes("invalid data")) {
              setError(
                "Upload successful but failed to save metadata: Invalid data format."
              );
            } else {
              setError(
                `Upload successful but failed to save metadata: ${firebaseError.message}`
              );
            }
          } else {
            setError(
              "Upload successful but failed to save metadata: Unknown error"
            );
          }
        }
      } else {
        setError(data.error || "Upload failed");
      }
    } catch (err) {
      console.error("Upload error:", err);
      if (err instanceof Error) {
        setError(`Upload failed: ${err.message}`);
      } else {
        setError("Something went wrong during upload");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
      if (!user) {
        setError(t("signInToAnalyze"));
        return;
      }

    // Get the GCS URI from localStorage
    const gcsUri = localStorage.getItem("gsUri");
      if (!gcsUri) {
        setError(t("noGcsUri"));
        return;
      }

    // Validate GCS URI format
      if (!gcsUri.startsWith("gs://")) {
        setError(t("invalidGcsUri"));
        return;
      }

    // Extract document ID from gsUri for Firebase updates
    const gsUriParts = gcsUri.split("/");
    const docId = gsUriParts[gsUriParts.length - 2];

      if (!docId) {
        setError(t("documentIdNotFound"));
        return;
      }

    setAnalyzeResult(null);
    setError(null);
    setAnalyzing(true);

    try {
      console.log("Starting analysis for document:", docId);
      console.log("GCS URI:", gcsUri);

      // Get the current user's ID token
      const token = await user.getIdToken();

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          gcsUri: gcsUri,
          documentId: docId,
          language: language,
        }),
      });

      // Check if response is JSON
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("Non-JSON response from analyze API:", text);
        setError(
          `Analysis failed: Server returned ${res.status} - ${res.statusText}`
        );

        // Update document status to failed
        try {
          const documentRef = doc(db, "documents", docId);
          await setDoc(
            documentRef,
            {
              status: "failed",
              analyzedAt: new Date(),
            },
            { merge: true }
          );
        } catch (firebaseError) {
          console.error(
            "Failed to update document status to failed:",
            firebaseError
          );
        }
        return;
      }

      const data = await res.json();

      if (res.ok) {
        console.log("Analysis completed successfully:", data.summary);
        setAnalyzeResult(data.summary);

        // Update document status in Firebase
        try {
          const documentRef = doc(db, "documents", docId);
          await setDoc(
            documentRef,
            {
              status: "completed",
              analyzedAt: new Date(),
              analysisResult: data.summary,
            },
            { merge: true }
          );
          console.log("✅ Document status updated to completed in Firebase");
        } catch (firebaseError) {
          console.error(
            "Failed to update document status to completed:",
            firebaseError
          );
        }
      } else {
        console.error("Analysis failed:", data.error);
        setError(data.error || t("analyzeError"));

        // Update document status to failed
        try {
          const documentRef = doc(db, "documents", docId);
          await setDoc(
            documentRef,
            {
              status: "failed",
              analyzedAt: new Date(),
            },
            { merge: true }
          );
        } catch (firebaseError) {
          console.error(
            "Failed to update document status to failed:",
            firebaseError
          );
        }
      }
      } catch (err) {
        console.error("Analyze error:", err);
        setError(t("analyzeError"));

        // Update document status to failed
        try {
          const documentRef = doc(db, "documents", docId);
          await setDoc(
            documentRef,
            {
              status: "failed",
              analyzedAt: new Date(),
            },
            { merge: true }
          );
        } catch (firebaseError) {
          console.error(
            "Failed to update document status to failed:",
            firebaseError
          );
        }
      } finally {
        setAnalyzing(false);
      }
  };

  if (!user) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>{t('signInToUpload')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-end sm:items-center sm:gap-4 gap-2">
        <Input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          accept=".pdf,.doc,.docx"
          aria-label={t("selectFile")}
          title={t("selectFile")}
        />
        <div>
          <Button
            onClick={handleUpload}
            disabled={uploading}
            loading={uploading}
          >
            {t('upload')}
          </Button>
          <Button
            onClick={handleAnalyze}
            disabled={uploading || !localStorage.getItem("gsUri")}
            loading={analyzing}
          >
            {t('analyze')}
          </Button>
        </div>
      </div>
      {analyzeResult && (
        <div className="bg-green-50 p-4 rounded border text-sm space-y-4">
          <div>
            <div className="font-bold text-lg mb-1">{t("summary")}</div>
            <div>{analyzeResult.short_summary}</div>
          </div>
          <div>
            <div className="font-bold mb-1">{t("keyPoints")}</div>
            <ul className="list-disc list-inside space-y-1">
              {analyzeResult.key_points?.map((point: string, idx: number) => (
                <li key={idx}>{point}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-bold mb-1">{t("importantTerms")}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(analyzeResult.extracted || {}).map(
                ([key, value]) => (
                  <div key={key} className="bg-white border rounded p-2">
                    <div className="font-semibold capitalize">
                      {t(key as keyof typeof translations.en)}
                    </div>
                    <div className="text-gray-700 break-words">{value}</div>
                  </div>
                )
              )}
            </div>
          </div>
          <div>
            <div className="font-bold mb-1">{t("potentialRisks")}</div>
            <ul className="space-y-2">
              {analyzeResult.risks?.map(
                (
                  risk: {
                    label: string;
                    severity: string;
                    why: string;
                    quote: string;
                  },
                  idx: number
                ) => (
                  <li
                    key={idx}
                    className="bg-red-50 border-l-4 border-red-400 p-2 rounded"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{risk.label}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold bg-${
                          risk.severity === "high"
                            ? "red"
                            : risk.severity === "medium"
                            ? "yellow"
                            : "green"
                        }-200 text-${
                          risk.severity === "high"
                            ? "red"
                            : risk.severity === "medium"
                            ? "yellow"
                            : "green"
                        }-800`}
                      >
                        {risk.severity}
                      </span>
                    </div>
                    <div className="italic text-gray-700">
                      &quot;{risk.quote}&quot;
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{risk.why}</div>
                  </li>
                )
              )}
            </ul>
          </div>
          <div className="text-xs text-gray-500 text-center pt-2 border-t">
            {analyzeResult.disclaimers?.[0] ||
              "This is an automated, informational summary and not legal advice."}
          </div>
        </div>
      )}
      <UploadStatus fileUrl={fileUrl} error={error} />
    </div>
  );
}
