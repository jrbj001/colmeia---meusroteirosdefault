import type { NextApiRequest, NextApiResponse } from 'next';
import api from '../../config/axios';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { grupo } = req.query;

  if (!grupo) {
    return res.status(400).json({ message: 'Grupo parameter is required' });
  }

  try {
    const response = await api.get(`/cidades?grupo=${grupo}`);
    return res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching cidades:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
} 