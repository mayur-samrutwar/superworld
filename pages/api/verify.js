import { getUserIdentifier, SelfBackendVerifier } from '@selfxyz/core';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { proof, publicSignals } = req.body;

    if (!proof || !publicSignals) {
      return res.status(400).json({ message: 'Proof and publicSignals are required' });
    }

    // Extract user ID from the proof
    const userId = await getUserIdentifier(publicSignals);
    console.log("Extracted userId:", userId);

    // Initialize and configure the verifier
    const endpoint = `${process.env.NEXT_PUBLIC_SUPERWORLD_URL}/api/verify`;
    
    // Initialize and configure the verifier with proper parameters
    const selfBackendVerifier = new SelfBackendVerifier(
      'superworld-finance', // Your app scope - must match frontend
      endpoint, // The API endpoint of this backend,
      'uuid',
      true
    );

    // Verify the proof
    const result = await selfBackendVerifier.verify(proof, publicSignals);
    
    console.log("Verification result:", result);
    
    if (result.isValid) {
      // Return successful verification response
      return res.status(200).json({
        status: 'success',
        result: true,
        credentialSubject: result.credentialSubject
      });
    } else {
      // Return failed verification response
      return res.status(500).json({
        status: 'error',
        result: false,
        message: 'Verification failed',
        details: result.isValidDetails
      });
    }
  } catch (error) {
    console.error('Error verifying proof:', error);
    
    return res.status(500).json({
      status: 'error',
      result: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 