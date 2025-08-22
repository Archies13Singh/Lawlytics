import { NextApiRequest, NextApiResponse } from 'next';
import { saveAnalysisToFirestore } from '../../../utils/firestoreClient';
import { getUserId } from '../../../utils/userSession';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const userId = getUserId();
    const analysisData = req.body;

    try {
      const analysisId = await saveAnalysisToFirestore({ ...analysisData, userId });
      res.status(200).json({ id: analysisId });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save analysis' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
