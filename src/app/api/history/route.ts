import { NextApiRequest, NextApiResponse } from 'next';
import { getUserAnalyses } from '../../../utils/firestoreClient';
import { getUserId } from '../../../utils/userSession';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const userId = getUserId();

    try {
      const analyses = await getUserAnalyses(userId);
      res.status(200).json(analyses);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch analysis history' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
