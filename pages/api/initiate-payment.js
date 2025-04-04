import { randomUUID } from 'crypto';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Generate a unique ID for the payment
    const uuid = randomUUID().replace(/-/g, '');

    // In a real app, you would store this ID in your database
    // along with payment details for verification later

    return res.status(200).json({ id: uuid });
  } catch (error) {
    console.error('Error initiating payment:', error);
    return res.status(500).json({ error: 'Failed to initiate payment' });
  }
} 