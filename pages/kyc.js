import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useMiniKitContext } from '../contexts/MiniKitContext';
import { getUniversalLink, SelfAppBuilder } from '@selfxyz/core';
import { v4 as uuidv4 } from 'uuid';
import io from 'socket.io-client';
import { useReadContract } from 'wagmi';
import UserProfileABI from '../contracts/abi/profile.json';

// Verification status constants to avoid typos
const VERIFICATION_STATUS = {
  PENDING: 'pending',
  STARTED: 'started',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  ERROR: 'error',
  CHECKING: 'checking'
};

export default function KYC() {
  const router = useRouter();
  const { walletAddress } = useMiniKitContext();
  const [kycStatus, setKycStatus] = useState(VERIFICATION_STATUS.CHECKING);
  const [showDeepLinkMessage, setShowDeepLinkMessage] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Checking verification status...');
  const socketRef = useRef(null);
  const verificationInProgress = useRef(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const checkAttempts = useRef(0);
  const maxCheckAttempts = 3;
  
  // Get contract address from environment variable
  const contractAddress = process.env.NEXT_PUBLIC_PROFILE_CONTRACT_ADDRESS;
  
  // Read if the user is verified from the contract
  const {
    data: isVerified,
    isError,
    isLoading: isVerificationLoading,
  } = useReadContract({
    address: contractAddress,
    abi: UserProfileABI,
    functionName: 'isUserVerified',
    args: walletAddress ? [walletAddress] : undefined,
    enabled: Boolean(contractAddress && walletAddress),
  });
  
  // Check if the user is verified on the blockchain
  useEffect(() => {
    if (isVerificationLoading) {
      setStatusMessage('Checking blockchain verification status...');
      return;
    }
    
    if (isVerified === true) {
      console.log('User is verified on the blockchain');
      setKycStatus(VERIFICATION_STATUS.VERIFIED);
      setStatusMessage('Your identity has been verified on the blockchain');
      
      // Redirect to home page after a short delay
      setTimeout(() => {
        window.location.href = '/?verified=true&fromKyc=true';
      }, 2000);
    } else if (isVerified === false) {
      console.log('User is not verified on the blockchain');
      setKycStatus(VERIFICATION_STATUS.PENDING);
      setStatusMessage('Please complete identity verification');
    }
  }, [isVerified, isVerificationLoading]);
  
  // Clear all KYC-related localStorage on mount for testing purposes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('Clearing all KYC-related localStorage for testing purposes');
      localStorage.removeItem('kycStatus');
      localStorage.removeItem('kycStatusNotified');
      localStorage.removeItem('completedKYC');
      localStorage.removeItem('bypassRestriction');
      // Don't remove selfUserId and selfSessionId here to allow for proper verification
    }
  }, []);
  
  // Load status from localStorage on initial render
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKycStatus = localStorage.getItem('kycStatus');
      if (savedKycStatus) {
        console.log('Loading saved KYC status from localStorage:', savedKycStatus);
        setKycStatus(savedKycStatus);
        
        // Update verification in progress state
        if (savedKycStatus === VERIFICATION_STATUS.STARTED) {
          verificationInProgress.current = true;
        } else {
          verificationInProgress.current = false;
        }
      }
    }
  }, []);
  
  // Initialize WebSocket connection
  const setupSocketConnection = useCallback(async () => {
    // Make sure we're on the client side
    if (typeof window === 'undefined') return;
    
    // Only set up the connection once
    if (socketRef.current && socketConnected) {
      console.log('Socket already connected, skipping setup');
      return;
    }
    
    // DEBUG: Log wallet address from context
    console.log('Current wallet address in setupSocketConnection:', walletAddress);
    
    // Check if we've exceeded max reconnect attempts
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.log('Max reconnect attempts reached, aborting connection');
      return;
    }
    
    // Fetch the stored userId and sessionId
    const userId = localStorage.getItem('selfUserId');
    const sessionId = localStorage.getItem('selfSessionId');
    
    if (!userId) {
      console.log('No userId found, skipping socket setup');
      return;
    }
    
    // Initialize socket connection
    try {
      reconnectAttempts.current += 1;
      console.log(`Socket connection attempt ${reconnectAttempts.current} of ${maxReconnectAttempts}`);
      
      // Initialize socket connection
      await fetch('/api/socket');
      
      // Configure socket with reconnection options
      const socket = io({
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000
      });
      
      socketRef.current = socket;
      
      socket.on('connect', () => {
        console.log('Socket connected with ID:', socket.id);
        setSocketConnected(true);
        reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection
        
        // Register with userId for tracking
        socket.emit('register', userId);
        
        // Also register with sessionId if available (Self Protocol compatibility)
        if (sessionId) {
          console.log('Registering with sessionId:', sessionId);
          socket.emit('register', sessionId);
        }
      });
      
      socket.on('verification_status', (data) => {
        console.log('Received verification status update:', data);
        
        // Hide the deep link message when status updates
        setShowDeepLinkMessage(false);
        
        // Set status message if available
        if (data.message) {
          setStatusMessage(data.message);
        }
        
        // Update KYC status based on WebSocket notification
        if (data.status === VERIFICATION_STATUS.VERIFIED) {
          setKycStatus(VERIFICATION_STATUS.VERIFIED);
          // Testing mode: Don't save to localStorage
          // localStorage.setItem('kycStatus', VERIFICATION_STATUS.VERIFIED);
          verificationInProgress.current = false;
          
          // Handle success notification (but don't store in localStorage)
          alert("Verification successful!");
          
          // Check if blockchain verification was successful
          if (data.blockchainVerification && data.blockchainVerification.success) {
            console.log("Blockchain verification successful:", data.blockchainVerification.hash);
            
            // Redirect to home page after a short delay
            setTimeout(() => {
              window.location.href = '/?verified=true&fromKyc=true';
            }, 2000);
          }
        } else if (data.status === VERIFICATION_STATUS.REJECTED || data.status === VERIFICATION_STATUS.ERROR) {
          setKycStatus(VERIFICATION_STATUS.REJECTED);
          // Testing mode: Don't save to localStorage
          // localStorage.setItem('kycStatus', VERIFICATION_STATUS.REJECTED);
          verificationInProgress.current = false;
          
          // Set error message if available
          if (data.error) {
            setStatusMessage(data.error);
          }
          
          // Handle failure notification (but don't store in localStorage)
          alert("Verification failed. Please try again.");
        } else if (data.status === VERIFICATION_STATUS.PENDING) {
          // If still pending, but verification is in progress
          if (!verificationInProgress.current) {
            verificationInProgress.current = true;
            setKycStatus(VERIFICATION_STATUS.STARTED);
            // Testing mode: Don't save to localStorage
            // localStorage.setItem('kycStatus', VERIFICATION_STATUS.STARTED);
          }
          
          // Update status message
          if (data.message) {
            setStatusMessage(data.message);
          }
        }
      });
      
      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`Socket reconnection attempt ${attemptNumber}`);
      });
      
      socket.on('reconnect', () => {
        console.log('Socket reconnected');
        setSocketConnected(true);
        
        // Re-register with userId
        if (userId) {
          socket.emit('register', userId);
        }
        
        // Re-register with sessionId if available
        if (sessionId) {
          socket.emit('register', sessionId);
        }
      });
      
      socket.on('reconnect_error', (error) => {
        console.error('Socket reconnection error:', error);
      });
      
      socket.on('reconnect_failed', () => {
        console.error('Socket reconnection failed');
      });
      
      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
      
      socket.on('disconnect', (reason) => {
        console.log(`Socket disconnected: ${reason}`);
        setSocketConnected(false);
        
        // If the disconnection is not initiated by the client, attempt to reconnect
        if (reason === 'io server disconnect') {
          // The server has forcefully disconnected the socket
          socket.connect();
        }
      });
      
      // Return cleanup function
      return () => {
        console.log('Cleaning up socket connection');
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      };
    } catch (error) {
      console.error('Error setting up socket connection:', error);
      setSocketConnected(false);
    }
  }, [socketConnected]);
  
  // Set up WebSocket connection on initial render and when userId changes
  useEffect(() => {
    const userId = localStorage.getItem('selfUserId');
    if (userId) {
      setupSocketConnection();
    }
    
    // Reconnect socket when window regains focus
    const handleFocus = () => {
      console.log('Window focused, checking socket connection');
      if (!socketConnected && reconnectAttempts.current < maxReconnectAttempts) {
        setupSocketConnection();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [setupSocketConnection]);
  
  // Add a function to close the deep link message manually
  const closeDeepLinkMessage = () => {
    setShowDeepLinkMessage(false);
  };

  // Handle visibility changes for session tracking
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Document became visible, checking verification status');
        // If verification is in progress, automatically check status
        if (verificationInProgress.current) {
          checkVerificationStatus();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Manual status check function
  const checkVerificationStatus = async () => {
    // Hide the deep link message when checking status
    setShowDeepLinkMessage(false);
    
    // Increment check attempts
    checkAttempts.current += 1;
    console.log(`Check attempt ${checkAttempts.current} of ${maxCheckAttempts}`);
    
    try {
      const userId = localStorage.getItem('selfUserId');
      if (!userId) {
        console.error('No user ID found for verification check');
        setStatusMessage('No verification session found');
        return;
      }
      
      // Get stored wallet address for verification
      const storedWalletAddress = localStorage.getItem('verificationWalletAddress') || walletAddress;
      console.log('Checking verification with wallet address:', storedWalletAddress);
      
      // Check local storage first
      const savedKycStatus = localStorage.getItem('kycStatus');
      if (savedKycStatus === VERIFICATION_STATUS.VERIFIED) {
        setKycStatus(VERIFICATION_STATUS.VERIFIED);
        setStatusMessage('Your identity has been verified');
        return;
      }
      
      // Update status to indicate we're checking
      setStatusMessage('Checking verification status...');
      
      // Verify socket connection is active
      if (!socketConnected && socketRef.current === null) {
        // Try to reconnect socket
        await setupSocketConnection();
      }
      
      // Now, directly check with the verify endpoint
      try {
        const response = await fetch('/api/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            checkOnly: true,
            userId: userId,
            walletAddress: storedWalletAddress // Include wallet address for blockchain verification
          }),
        });
        
        const data = await response.json();
        console.log('Direct verification status check:', data);
        
        // If we have a result, update the UI
        if (data.result) {
          if (data.result.status === VERIFICATION_STATUS.VERIFIED) {
            setKycStatus(VERIFICATION_STATUS.VERIFIED);
            setStatusMessage('Your identity has been verified');
            localStorage.setItem('kycStatus', VERIFICATION_STATUS.VERIFIED);
          } else if (data.result.status === VERIFICATION_STATUS.REJECTED || data.result.status === VERIFICATION_STATUS.ERROR) {
            setKycStatus(VERIFICATION_STATUS.REJECTED);
            setStatusMessage(data.result.error || 'Verification failed');
            localStorage.setItem('kycStatus', VERIFICATION_STATUS.REJECTED);
          } else {
            setStatusMessage(data.result.message || 'Verification is still in progress');
          }
        } else {
          // No stored result
          setStatusMessage('No verification result found. You may need to complete verification');
        }
      } catch (error) {
        console.error('Error checking verification status directly:', error);
        setStatusMessage('Error checking status directly');
      }
    } catch (error) {
      console.error('Error in checkVerificationStatus:', error);
      setStatusMessage('Error checking status');
    }
  };
  
  // Launch Self Protocol for verification directly
  const launchSelfVerification = () => {
    // Reset status notifications
    localStorage.removeItem('kycStatusNotified');
    
    // Update KYC status to started
    setKycStatus(VERIFICATION_STATUS.STARTED);
    localStorage.setItem('kycStatus', VERIFICATION_STATUS.STARTED);
    verificationInProgress.current = true;
    
    // DEBUG: Log wallet address before starting verification
    console.log('Starting KYC verification with wallet address:', walletAddress);
    
    // Show pre-redirect message
    setShowDeepLinkMessage(true);
    
    try {
      // Generate a valid UUID for the user and session
      const userId = uuidv4();
      const sessionId = uuidv4(); // Generate separate sessionId for Self Protocol
      
      // Include walletAddress in the endpoint query to pass it to the backend
      let endpoint = `${process.env.NEXT_PUBLIC_SUPERWORLD_URL}/api/verify`;
      
      // Add wallet address as a query parameter to the endpoint URL if available
      if (walletAddress) {
        // Make sure to encode the wallet address properly
        const encodedAddress = encodeURIComponent(walletAddress);
        endpoint = `${endpoint}?walletAddress=${encodedAddress}`;
        console.log('Modified endpoint with wallet address:', endpoint);
      }
      
      // Add wallet address as a custom parameter
      const customParams = {
        walletAddress: walletAddress
      };
      
      // Create a Self App instance using the builder pattern
      const selfApp = new SelfAppBuilder({
        appName: "SuperWorld Finance",
        scope: "superworld-finance", 
        endpoint: endpoint,
        userId: userId, // Use the generated UUID
        sessionId: sessionId, // Use sessionId for Self Protocol compatibility
        customParams: customParams, // Pass wallet address as custom parameter
        disclosures: {
          minimumAge: 18,
        },
        devMode: true
      }).build();
      
      // Save the IDs for later verification
      localStorage.setItem('selfUserId', userId);
      localStorage.setItem('selfSessionId', sessionId);
      // Store wallet address with userId for verification lookup
      localStorage.setItem('verificationWalletAddress', walletAddress);
      
      // Get the deeplink URL
      const deeplink = getUniversalLink(selfApp);
      console.log("Generated deeplink:", deeplink);
      
      // Setup WebSocket connection before redirecting
      setupSocketConnection();
      
      // Redirect after a short delay
      setTimeout(() => {
        // Redirect to Self app
        window.location.href = deeplink;
      }, 2000);
    } catch (error) {
      console.error('Failed to create Self app:', error);
      
      // Fallback to direct deep link if SDK fails
      const callbackUrl = window.location.href.split('?')[0]; // Remove any query params
      const params = new URLSearchParams({
        callback: callbackUrl,
        appId: 'superworld-finance',
        flow: 'kyc-verification'
      });
      
      const selfProtocolUrl = `selfprotocol://verify?${params.toString()}`;
      const selfAppStoreUrl = 'https://apps.apple.com/app/self-id/id1595472483';
      
      // Attempt to open Self app
      setTimeout(() => {
        // Try to open Self Protocol deep link
        const openedAt = Date.now();
        window.location.href = selfProtocolUrl;
        
        // If app doesn't open, redirect to App Store
        setTimeout(function() {
          if (Date.now() - openedAt < 1500) {
            window.location.href = selfAppStoreUrl;
          }
        }, 500);
      }, 2000);
    }
  };
  
  // Handle skip button click
  const handleSkip = () => {
    localStorage.setItem('completedKYC', 'true');
    localStorage.setItem('bypassRestriction', 'true');
    // Use window.location to force a complete page reload to bypass React routing
    window.location.href = '/';
  };

  // Start fresh verification
  const startNewVerification = () => {
    // Clear all verification data
    localStorage.removeItem('kycStatus');
    localStorage.removeItem('kycStatusNotified');
    localStorage.removeItem('selfUserId');
    localStorage.removeItem('selfSessionId');
    
    // Reset state
    setKycStatus(VERIFICATION_STATUS.PENDING);
    setStatusMessage('');
    verificationInProgress.current = false;
    
    // Start new verification
    launchSelfVerification();
  };

  // Render the correct action buttons based on verification status
  const renderActionButtons = () => {
    if (kycStatus === VERIFICATION_STATUS.VERIFIED) {
      return (
        <button 
          onClick={() => {
            // Use direct URL navigation with a special parameter to signal the index page not to redirect
            window.location.href = '/?verified=true&fromKyc=true'; 
          }}
          className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-md transition duration-200"
        >
          Continue to App
        </button>
      );
    } else if (kycStatus === VERIFICATION_STATUS.STARTED || verificationInProgress.current) {
      return (
        <div className="space-y-4">
          <div className="px-4 py-3 bg-blue-50 text-blue-800 rounded-lg flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">
              {statusMessage || "Verification in progress. You can check the status or start a new verification."}
            </p>
          </div>
          
          <button 
            onClick={checkVerificationStatus}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg shadow-md transition duration-200"
          >
            Check Status
          </button>
          
          <button 
            onClick={startNewVerification}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition duration-200"
          >
            Start New Verification
          </button>
        </div>
      );
    } else if (kycStatus === VERIFICATION_STATUS.REJECTED) {
      return (
        <div className="space-y-4">
          <div className="px-4 py-3 bg-red-50 text-red-800 rounded-lg flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">
              {statusMessage || "Your verification was not successful. Please try again with valid documents."}
            </p>
          </div>
          
          <button 
            onClick={startNewVerification}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition duration-200"
          >
            Try Again
          </button>
          
          <button 
            onClick={handleSkip}
            className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition duration-200"
          >
            Skip for Now
          </button>
        </div>
      );
    } else if (kycStatus === VERIFICATION_STATUS.CHECKING) {
      return (
        <div className="flex flex-col items-center justify-center py-6">
          <div className="flex space-x-2 justify-center items-center mb-4">
            <div className="h-2.5 w-2.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="h-2.5 w-2.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="h-2.5 w-2.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <p className="text-sm text-gray-600">{statusMessage}</p>
        </div>
      );
    } else {
      return (
        <>
          <p className="text-gray-600 text-sm mb-4">wallet address: {walletAddress}</p>
          <button 
            onClick={launchSelfVerification}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition duration-200"
          >
            Verify Identity
          </button>
          
          <button 
            onClick={handleSkip}
            className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition duration-200"
          >
            Skip for Now
          </button>
        </>
      );
    }
  };

  // Override the function to send proof to backend with wallet address
  const sendProofToBackend = async (proof, publicSignals) => {
    try {
      // DEBUG: Log wallet address before sending to backend
      console.log('Sending proof to backend with wallet address:', walletAddress);
      
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proof,
          publicSignals,
          walletAddress // Include wallet address for blockchain verification
        }),
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error sending proof to backend:', error);
      throw error;
    }
  };

  // If the user is already verified, redirect to home
  useEffect(() => {
    // If isVerified is true, redirect to home
    if (kycStatus === VERIFICATION_STATUS.VERIFIED) {
      const timer = setTimeout(() => {
        window.location.href = '/?verified=true&fromKyc=true';
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [kycStatus]);

  // In loading state, show a full-screen loader
  if (kycStatus === VERIFICATION_STATUS.CHECKING) {
    return (
      <div className="min-h-screen bg-gray-50 font-['Inter'] flex flex-col justify-center items-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="rounded-full bg-indigo-100 p-4 mx-auto mb-5 w-20 h-20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Checking Verification Status</h2>
          <div className="flex space-x-2 justify-center items-center my-4">
            <div className="h-3 w-3 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="h-3 w-3 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="h-3 w-3 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <p className="text-gray-600 mb-1">{statusMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-['Inter']">
      <Head>
        <title>Verify Your Identity - SuperWorld App</title>
        <meta name="description" content="Complete KYC verification for World Super App" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      {/* Deep Link Message */}
      {showDeepLinkMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Redirecting to Self Protocol</h3>
            <p className="text-gray-600 mb-4">
              You're being redirected to Self Protocol for secure identity verification.
            </p>
            <div className="flex flex-col space-y-4">
              <div className="flex justify-center">
                <div className="animate-pulse flex space-x-2">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                  <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                </div>
              </div>
              
              <button 
                onClick={closeDeepLinkMessage}
                className="py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                Close This Message
              </button>
            </div>
          </div>
        </div>
      )}
      
      <main className="max-w-[480px] mx-auto px-5 py-8 relative min-h-screen overflow-auto">
        {/* Header with gradient background */}
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-indigo-600 to-indigo-500 z-0"></div>
        
        {/* Content */}
        <div className="relative z-10 pt-8">
          {/* Logo/App Name */}
          <div className="flex flex-col items-center mb-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">SuperWorld App</h1>
          </div>

          {/* KYC Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mt-4">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="rounded-full bg-blue-100 p-3 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Verify Your Identity</h2>
              <p className="text-gray-600 mb-1">Complete KYC verification to unlock all features</p>
            </div>
            
            {/* KYC Status */}
            <div className="mb-6">
              <div className="flex items-center mb-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                  kycStatus === VERIFICATION_STATUS.VERIFIED 
                    ? 'bg-green-100 text-green-500' 
                    : kycStatus === VERIFICATION_STATUS.REJECTED 
                      ? 'bg-red-100 text-red-500'
                      : 'bg-yellow-100 text-yellow-500'
                }`}>
                  {kycStatus === VERIFICATION_STATUS.VERIFIED ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : kycStatus === VERIFICATION_STATUS.REJECTED ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">Status</h4>
                  <p className={`text-sm ${
                    kycStatus === VERIFICATION_STATUS.VERIFIED 
                      ? 'text-green-500' 
                      : kycStatus === VERIFICATION_STATUS.REJECTED 
                        ? 'text-red-500'
                        : 'text-yellow-500'
                  }`}>
                    {kycStatus === VERIFICATION_STATUS.VERIFIED 
                      ? 'Verified' 
                      : kycStatus === VERIFICATION_STATUS.REJECTED 
                        ? 'Verification Failed'
                        : 'Pending Verification'}
                  </p>
                </div>
              </div>
              
              <p className="text-gray-600 text-sm mb-4">
                {kycStatus === VERIFICATION_STATUS.VERIFIED 
                  ? 'Your identity has been verified. You now have full access to all features.' 
                  : kycStatus === VERIFICATION_STATUS.REJECTED 
                    ? 'Your verification was not successful. Please try again with valid documents.'
                    : 'Complete identity verification to access all platform features.'}
              </p>
              
              {/* Verification Actions */}
              <div className="space-y-4">
                {renderActionButtons()}
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* WebSocket Status Indicator (for debugging) */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          {socketConnected ? 
            <span className="text-green-500">Socket connected</span> : 
            <span className="text-yellow-500">Socket disconnected</span>
          }
        </p>
      </div>
    </div>
  );
} 