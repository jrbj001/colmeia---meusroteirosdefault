import type { NextApiRequest, NextApiResponse } from 'next';
import api from '../../config/axios';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { desc_pk } = req.query;

  if (!desc_pk) {
    return res.status(400).json({ message: 'desc_pk parameter is required' });
  }

  try {
    const response = await api.get(`/semanas?desc_pk=${desc_pk}`);
    return res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching semanas:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 