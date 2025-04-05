import { getUserIdentifier, SelfBackendVerifier } from '@selfxyz/core';
import { notifyClient, getStoredVerificationResult } from './socket';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import UserProfileABI from '../../contracts/abi/profile.json';

// Define the World chain
const worldChain = {
  id: 4801,
  name: 'World Chain Sepolia',
  network: 'worldchain-sepolia',
  rpcUrls: {
    default: {
      http: ['https://worldchain-sepolia.g.alchemy.com/public'],
    },
  },
};

// Get contract address from environment variable
const PROFILE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PROFILE_CONTRACT_ADDRESS;
const ADMIN_PVT_KEY = process.env.ADMIN_PVT_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { proof, publicSignals, checkOnly, walletAddress: bodyWalletAddress } = req.body;
    
    // Check for wallet address in URL query parameters
    const queryWalletAddress = req.query?.walletAddress;
    
    // Use wallet address from body, query, or null
    const walletAddress = bodyWalletAddress || queryWalletAddress || null;
    
    console.log('Request processing - Sources of wallet address:', {
      body: bodyWalletAddress,
      query: queryWalletAddress,
      using: walletAddress
    });
    
    console.log('Request body:', JSON.stringify({
      checkOnly,
      hasProof: !!proof,
      hasPublicSignals: !!publicSignals,
      walletAddress
    }));

    // If this is a request to just check status
    if (checkOnly) {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required for status check' });
      }
      
      console.log(`Checking status for userId ${userId} with wallet address:`, walletAddress);
      
      // Get stored verification result
      const storedResult = getStoredVerificationResult(userId);
      
      if (storedResult) {
        console.log(`Found stored verification result for userId ${userId}:`, storedResult);
        
        // If we have a wallet address and the stored result is verified, attempt blockchain verification
        if (walletAddress && storedResult.status === 'verified' && !storedResult.blockchainVerification) {
          console.log("User verified but not yet on blockchain. Attempting blockchain verification with:", walletAddress);
          
          try {
            // Create wallet client with admin's private key
            const account = privateKeyToAccount(`0x${ADMIN_PVT_KEY.startsWith('0x') ? ADMIN_PVT_KEY.slice(2) : ADMIN_PVT_KEY}`);
            const client = createWalletClient({
              account,
              chain: worldChain,
              transport: http()
            });
            
            // Call verifyUser function on the UserProfile contract
            const hash = await client.writeContract({
              address: PROFILE_CONTRACT_ADDRESS,
              abi: UserProfileABI,
              functionName: 'verifyUser',
              args: [walletAddress]
            });
            
            console.log("User verified on blockchain. Transaction hash:", hash);
            
            // Add blockchain verification details to result
            storedResult.blockchainVerification = {
              success: true,
              hash: hash
            };
          } catch (blockchainError) {
            console.error("Error verifying user on blockchain:", blockchainError);
            
            // Add blockchain verification error to result
            storedResult.blockchainVerification = {
              success: false,
              error: blockchainError.message
            };
          }
        } else if (!walletAddress && storedResult.status === 'verified') {
          console.log("No wallet address provided during status check. Skipping blockchain verification.");
        }
        
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

    // Check if we have any custom params in the publicSignals
    const customParams = publicSignals.customParams;
    console.log("Custom params from publicSignals:", customParams);

    // Debug log to check what's in publicSignals
    console.log("Public signals structure:", Object.keys(publicSignals));

    // Parse the customParams if they exist
    if (customParams && typeof customParams === 'string') {
      try {
        const parsedParams = JSON.parse(customParams);
        console.log("Parsed custom params:", parsedParams);
        
        // If we have a wallet address in customParams but not in req.body
        if (parsedParams.walletAddress && !walletAddress) {
          req.body.walletAddress = parsedParams.walletAddress;
          console.log("Found wallet address in customParams:", parsedParams.walletAddress);
        }
      } catch (error) {
        console.error("Error parsing customParams:", error);
      }
    }

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
      
      // If wallet address is provided, update user verification status on blockchain
      if (walletAddress) {
        try {
          console.log("Verifying user on blockchain:", walletAddress);
          
          // Create wallet client with admin's private key
          const account = privateKeyToAccount(`0x${ADMIN_PVT_KEY.startsWith('0x') ? ADMIN_PVT_KEY.slice(2) : ADMIN_PVT_KEY}`);
          const client = createWalletClient({
            account,
            chain: worldChain,
            transport: http()
          });
          
          // Call verifyUser function on the UserProfile contract
          const hash = await client.writeContract({
            address: PROFILE_CONTRACT_ADDRESS,
            abi: UserProfileABI,
            functionName: 'verifyUser',
            args: [walletAddress]
          });
          
          console.log("User verified on blockchain. Transaction hash:", hash);
          
          // Add blockchain verification details to response
          response.blockchainVerification = {
            success: true,
            hash: hash
          };
          
          // Add blockchain verification details to status update
          statusUpdate.blockchainVerification = {
            success: true,
            hash: hash
          };
        } catch (blockchainError) {
          console.error("Error verifying user on blockchain:", blockchainError);
          
          // Add blockchain verification error to response
          response.blockchainVerification = {
            success: false,
            error: blockchainError.message
          };
          
          // Add blockchain verification error to status update
          statusUpdate.blockchainVerification = {
            success: false,
            error: blockchainError.message
          };
        }
      } else {
        console.log("No wallet address provided. Skipping blockchain verification.");
      }
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