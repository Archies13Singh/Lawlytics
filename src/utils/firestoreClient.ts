import { Firestore, DocumentData, QueryDocumentSnapshot } from '@google-cloud/firestore';

// Initialize Firestore
let firestore: Firestore;

try {
  // For production/Google Cloud environment
  firestore = new Firestore();
} catch (error) {
  console.warn('Firestore initialization failed, using local development mode');
  // For local development, we'll handle this through environment variables
}

export interface Risk {
  label: string;
  severity: string;
  why: string;
  quote: string;
}

export interface ExtractedData {
  parties?: string;
  effective_date?: string;
  term?: string;
  notice_period?: string;
  payment_terms?: string;
  security_deposit?: string;
  maintenance_responsibility?: string;
  late_fee?: string;
  renewal?: string;
  termination?: string;
  jurisdiction?: string;
  [key: string]: unknown;
}

export interface AnalysisResult {
  short_summary: string;
  key_points: string[];
  extracted: ExtractedData;
  risks: Risk[];
  disclaimers: string[];
}

export interface DocumentAnalysis {
  id?: string;
  userId: string;
  fileName: string;
  fileSize: number;
  uploadDate: Date;
  analysisResult: AnalysisResult;
  shortSummary: string;
  keyPoints: string[];
  extractedData: ExtractedData;
  risks: Risk[];
  disclaimers: string[];
}

export const saveAnalysisToFirestore = async (analysis: Omit<DocumentAnalysis, 'id'>): Promise<string> => {
  try {
    const docRef = await firestore.collection('documentAnalyses').add({
      ...analysis,
      uploadDate: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving analysis to Firestore:', error);
    throw new Error('Failed to save analysis to database');
  }
};

export const getUserAnalyses = async (userId: string): Promise<DocumentAnalysis[]> => {
  try {
    const snapshot = await firestore
      .collection('documentAnalyses')
      .where('userId', '==', userId)
      .orderBy('uploadDate', 'desc')
      .get();

    return snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        uploadDate: data.uploadDate?.toDate(),
      } as DocumentAnalysis;
    });
  } catch (error) {
    console.error('Error fetching user analyses:', error);
    throw new Error('Failed to fetch analysis history');
  }
};

export const getAnalysisById = async (analysisId: string): Promise<DocumentAnalysis | null> => {
  try {
    const doc = await firestore.collection('documentAnalyses').doc(analysisId).get();
    
    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      uploadDate: data?.uploadDate?.toDate(),
    } as DocumentAnalysis;
  } catch (error) {
    console.error('Error fetching analysis by ID:', error);
    throw new Error('Failed to fetch analysis');
  }
};

export default firestore;
