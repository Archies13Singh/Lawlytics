"use client";

import { useState } from "react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import UploadStatus from "./UploadStatus";

export default function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<any | null>(null);

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setFileUrl(data.url);
        localStorage.setItem("gsUri", data.gsUri);
      } else {
        setError(data.error || "Upload failed");
      }
    } catch (err) {
      setError("Something went wrong");
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    const gsUri = localStorage.getItem("gsUri");
    setAnalyzeResult(null);
    setError(null);
    setAnalyzing(true);
    if (!gsUri) {
      setError("No GCS URI found. Please upload again.");
      setAnalyzing(false);
      return;
    }
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gcsUri: gsUri }),
      });
      const data = await res.json();
      if (res.ok) {
        setAnalyzeResult(data.summary);
      } else {
        setError(data.error || "Analyze failed");
      }
    } catch (err) {
      setError("Analyze error");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <Button onClick={handleUpload} disabled={uploading} loading={uploading}>
        Upload
      </Button>
      <Button
        onClick={handleAnalyze}
        disabled={uploading || !fileUrl}
        loading={analyzing}
      >
        Analyze
      </Button>
      {analyzeResult && (
        <div className="bg-green-50 p-4 rounded border text-sm space-y-4">
          <div>
            <div className="font-bold text-lg mb-1">Summary</div>
            <div>{analyzeResult.short_summary}</div>
          </div>
          <div>
            <div className="font-bold mb-1">Key Points</div>
            <ul className="list-disc list-inside space-y-1">
              {analyzeResult.key_points?.map((point: string, idx: number) => (
                <li key={idx}>{point}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-bold mb-1">Important Terms</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(analyzeResult.extracted || {}).map(([key, value]) => (
                <div key={key} className="bg-white border rounded p-2">
                  <div className="font-semibold capitalize">{key.replace(/_/g, ' ')}</div>
                  <div className="text-gray-700 break-words">{value}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="font-bold mb-1">Potential Risks</div>
            <ul className="space-y-2">
              {analyzeResult.risks?.map((risk: { label: string; severity: string; why: string; quote: string }, idx: number) => (
                <li key={idx} className="bg-red-50 border-l-4 border-red-400 p-2 rounded">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{risk.label}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold bg-${risk.severity === 'high' ? 'red' : risk.severity === 'medium' ? 'yellow' : 'green'}-200 text-${risk.severity === 'high' ? 'red' : risk.severity === 'medium' ? 'yellow' : 'green'}-800`}>{risk.severity}</span>
                  </div>
                  <div className="italic text-gray-700">&quot;{risk.quote}&quot;</div>
                  <div className="text-xs text-gray-600 mt-1">{risk.why}</div>
                </li>
              ))}
            </ul>
          </div>
          <div className="text-xs text-gray-500 text-center pt-2 border-t">
            {analyzeResult.disclaimers?.[0] || 'This is an automated, informational summary and not legal advice.'}
          </div>
        </div>
      )}
      <UploadStatus fileUrl={fileUrl} error={error} />
    </div>
  );
}