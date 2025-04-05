import { getUserIdentifier, SelfBackendVerifier } from '@selfxyz/core';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { proof, publicSignals, callback } = req.body;

    if (!proof || !publicSignals) {
      return res.status(400).json({ 
        status: 'error',
        result: false,
        message: 'Proof and publicSignals are required' 
      });
    }

    // Extract user ID from the proof
    const userId = await getUserIdentifier(publicSignals);
    console.log("Extracted userId:", userId);

    // Initialize and configure the verifier
    const appUrl = process.env.NEXT_PUBLIC_SUPERWORLD_URL || 'http://localhost:3000';
    const selfBackendVerifier = new SelfBackendVerifier(
      'superworld-finance',  // Match scope with frontend
      appUrl + '/api/verify'  // Your deployed API endpoint
    );

    // Add minimum age requirement (must match frontend)
    selfBackendVerifier.setMinimumAge(18);

    // Verify the proof
    const result = await selfBackendVerifier.verify(proof, publicSignals);
    
    console.log("Verification result:", result);
    
    // Determine redirect URL with status
    let redirectUrl = callback || (appUrl + '/profile');
    const redirectStatus = result.isValid ? 'success' : 'failed';
    
    // Add status parameter to URL
    if (redirectUrl.includes('?')) {
      redirectUrl += `&verification_status=${redirectStatus}`;
    } else {
      redirectUrl += `?verification_status=${redirectStatus}`;
    }
    
    if (result.isValid) {
      // Return successful verification response with redirect URL
      return res.status(200).json({
        status: 'success',
        result: true,
        redirectUrl: redirectUrl,
        credentialSubject: result.credentialSubject
      });
    } else {
      // Return failed verification response with redirect URL
      return res.status(200).json({  // Using 200 for Self Protocol to handle
        status: 'error',
        result: false,
        redirectUrl: redirectUrl,
        message: 'Verification failed',
        details: result.isValidDetails
      });
    }
  } catch (error) {
    console.error('Error verifying proof:', error);
    
    // Even on error, try to redirect back
    const appUrl = process.env.NEXT_PUBLIC_SUPERWORLD_URL || 'http://localhost:3000';
    const redirectUrl = `${appUrl}/profile?verification_status=failed`;
    
    return res.status(500).json({
      status: 'error',
      result: false,
      redirectUrl: redirectUrl,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 