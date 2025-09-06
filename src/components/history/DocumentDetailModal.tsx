"use client";

import { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { translations } from '@/utils/translations';
import Button from '../ui/Button';

interface DocumentRecord {
  id: string;
  fileName: string;
  fileUrl: string;
  gsUri: string;
  uploadedAt: Date;
  analyzedAt?: Date;
  analysisResult?: any;
  status: 'uploaded' | 'analyzing' | 'completed' | 'failed';
}

interface DocumentDetailModalProps {
  document: DocumentRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (document: DocumentRecord) => void;
}

export default function DocumentDetailModal({
  document,
  isOpen,
  onClose,
  onDownload
}: DocumentDetailModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { t } = useTranslation();

  if (!isOpen || !document) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await onDownload(document);
    } finally {
      setIsDownloading(false);
    }
  };

  const renderAnalysisResult = () => {
    if (!document.analysisResult) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>{t("noAnalysisResults")}</p>
          {document.status === 'analyzing' && (
            <p className="mt-2">{t("analysisInProgress")}</p>
          )}
          {document.status === 'failed' && (
            <p className="mt-2 text-red-500">{t("analysisFailed")}</p>
          )}
        </div>
      );
    }

    const { analysisResult } = document;

    return (
      <div className="space-y-6">
        {/* Short Summary */}
        <div>
          <h3 className="text-lg font-semibold mb-2">{t("summary")}</h3>
          <p className="text-gray-700">{analysisResult.short_summary}</p>
        </div>

        {/* Key Points */}
        {analysisResult.key_points && analysisResult.key_points.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">{t("keyPoints")}</h3>
            <ul className="list-disc list-inside space-y-1">
              {analysisResult.key_points.map((point: string, index: number) => (
                <li key={index} className="text-gray-700">{point}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Extracted Information */}
        {analysisResult.extracted && (
          <div>
            <h3 className="text-lg font-semibold mb-3">{t("extractedInformation")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(analysisResult.extracted).map(([key, value]) => (
                <div key={key} className="bg-gray-50 p-3 rounded">
                  <span className="font-medium text-gray-900 capitalize">
                    {t(key as keyof typeof translations.en)}:
                  </span>
                  <span className="ml-2 text-gray-700">
                    {value === 'NOT STATED' ? t("notStated") : value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risks */}
        {analysisResult.risks && analysisResult.risks.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">{t("risksIdentified")}</h3>
            <div className="space-y-3">
              {analysisResult.risks.map((risk: any, index: number) => (
                <div key={index} className="border border-yellow-200 bg-yellow-50 p-4 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-yellow-800">{risk.label}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      risk.severity === 'high' ? 'bg-red-100 text-red-800' :
                      risk.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {risk.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-yellow-700 mb-2">{risk.why}</p>
                  {risk.quote && (
                    <blockquote className="border-l-4 border-yellow-300 pl-4 italic text-yellow-600">
                      "{risk.quote}"
                    </blockquote>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimers */}
        {analysisResult.disclaimers && analysisResult.disclaimers.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-2">{t("importantDisclaimers")}</h3>
            <div className="space-y-2">
              {analysisResult.disclaimers.map((disclaimer: string, index: number) => (
                <div key={index} className="bg-blue-50 border border-blue-200 p-3 rounded">
                  <p className="text-blue-800 text-sm">{disclaimer}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(52, 78, 65, 0.8)' }}>
      <div className="rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden" style={{ backgroundColor: '#dad7cd' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#588157' }}>
          <div>
            <h2 className="text-xl font-semibold" style={{ color: '#3a5a40' }}>{document.fileName}</h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <span>Uploaded: {document.uploadedAt.toLocaleDateString()}</span>
              {document.analyzedAt && (
                <span>Analyzed: {document.analyzedAt.toLocaleDateString()}</span>
              )}
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                document.status === 'completed' ? 'bg-green-100 text-green-800' :
                document.status === 'analyzing' ? 'bg-yellow-100 text-yellow-800' :
                document.status === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {document.status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              size="sm"
              variant="outline"
            >
              {isDownloading ? t("downloading") : t("downloadPDF")}
            </Button>
            <Button
              onClick={onClose}
              size="sm"
              variant="outline"
            >
              {t("close")}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {renderAnalysisResult()}
        </div>
      </div>
    </div>
  );
}
