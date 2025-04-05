import { getUserIdentifier, SelfBackendVerifier } from '@selfxyz/core';
import { notifyClient, getStoredVerificationResult } from './socket';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { proof, publicSignals, checkOnly } = req.body;

    // If this is a request to just check status
    if (checkOnly) {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required for status check' });
      }
      
      // Get stored verification result
      const storedResult = getStoredVerificationResult(userId);
      
      if (storedResult) {
        console.log(`Found stored verification result for userId ${userId}:`, storedResult);
        // Notify client about the stored result
        notifyClient(userId, storedResult);
        
        return res.status(200).json({
          status: 'success',
          message: 'Retrieved stored verification result',
          result: storedResult
        });
      } else {
        return res.status(200).json({
          status: 'pending',
          message: 'No verification result found'
        });
      }
    }

    // Regular verification flow
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

    // Notify that verification has started via WebSocket
    notifyClient(userId, {
      status: 'pending',
      message: 'Verification process started',
      timestamp: new Date().toISOString()
    });

    // Verify the proof
    const result = await selfBackendVerifier.verify(proof, publicSignals);
    
    console.log("Verification result:", result);
    
    // Create a response object
    let response;
    let statusUpdate;
    
    if (result.isValid) {
      // Create successful verification response
      response = {
        status: 'success',
        result: true,
        credentialSubject: result.credentialSubject
      };
      
      // Create status update for WebSocket
      statusUpdate = {
        status: 'verified',
        data: result.credentialSubject,
        timestamp: new Date().toISOString()
      };
      
      // Store results in database (replace with your actual database operations)
      // In a production app, you would save this to your database
      console.log(`User ${userId} verified successfully. Result stored.`);
    } else {
      // Create failed verification response
      response = {
        status: 'error',
        result: false,
        message: 'Verification failed',
        details: result.isValidDetails
      };
      
      // Create status update for WebSocket
      statusUpdate = {
        status: 'rejected',
        error: 'Verification failed',
        details: result.isValidDetails,
        timestamp: new Date().toISOString()
      };
    }
    
    // Always notify client - this will store the result and send if client is connected
    notifyClient(userId, statusUpdate);
    
    // Return the response
    return res.status(result.isValid ? 200 : 500).json(response);
  } catch (error) {
    console.error('Error verifying proof:', error);
    
    // Try to extract userId from error if possible
    let userId = null;
    try {
      if (req.body && req.body.publicSignals) {
        userId = await getUserIdentifier(req.body.publicSignals);
      } else if (req.body && req.body.userId) {
        userId = req.body.userId;
      }
    } catch (e) {
      console.error('Could not extract userId from error context:', e);
    }
    
    // Create error response
    const response = {
      status: 'error',
      result: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
    
    // Create status update for WebSocket
    const statusUpdate = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
    
    // Notify connected client via WebSocket if we have a userId
    if (userId) {
      notifyClient(userId, statusUpdate);
    }
    
    return res.status(500).json(response);
  }
} 