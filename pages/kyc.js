import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useMiniKitContext } from '../contexts/MiniKitContext';
import { getUniversalLink, SelfAppBuilder } from '@selfxyz/core';
import { v4 as uuidv4 } from 'uuid';

export default function KYC() {
  const router = useRouter();
  const [kycStatus, setKycStatus] = useState('pending'); // 'pending', 'verified', 'rejected'
  const [showDeepLinkMessage, setShowDeepLinkMessage] = useState(false);
  
  // Check for verification status
  useEffect(() => {
    // Check localStorage for verification status
    if (typeof window !== 'undefined') {
      // Clear any lingering message
      setShowDeepLinkMessage(false);
      
      // Check localStorage for verification status
      const savedKycStatus = localStorage.getItem('kycStatus');
      if (savedKycStatus) {
        setKycStatus(savedKycStatus);
        
        // If we need to show a notification, it would go here
        if (savedKycStatus === 'verified' && localStorage.getItem('kycStatusNotified') !== 'true') {
          alert("Verification successful!");
          localStorage.setItem('kycStatusNotified', 'true');
        } else if (savedKycStatus === 'rejected' && localStorage.getItem('kycStatusNotified') !== 'true') {
          alert("Verification failed. Please try again.");
          localStorage.setItem('kycStatusNotified', 'true');
        }
      }
    }
  }, []);
  
  // Launch Self Protocol for verification directly
  const launchSelfVerification = () => {
    // Reset status notifications
    localStorage.removeItem('kycStatusNotified');
    
    // Update KYC status to started
    setKycStatus('started');
    localStorage.setItem('kycStatus', 'started');
    
    // Show pre-redirect message
    setShowDeepLinkMessage(true);
    
    try {
      // Generate a valid UUID for the user
      const userId = uuidv4();
      const endpoint = `${process.env.NEXT_PUBLIC_SUPERWORLD_URL}/api/verify`;
      
      // Create a Self App instance using the builder pattern
      const selfApp = new SelfAppBuilder({
        appName: "SuperWorld Finance",
        scope: "superworld-finance", 
        endpoint: endpoint,
        userId: userId, // Use the generated UUID
        disclosures: {
          minimumAge: 18,
        },
        devMode: true
      }).build();
      
      // Save the userId for later verification
      localStorage.setItem('selfUserId', userId);
      
      // Get the deeplink URL
      const deeplink = getUniversalLink(selfApp);
      console.log("Generated deeplink:", deeplink);
      
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
            <div className="flex justify-center">
              <div className="animate-pulse flex space-x-2">
                <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
              </div>
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
            <h1 className="text-2xl font-bold text-white">SuperWorld  App</h1>
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
                  kycStatus === 'verified' 
                    ? 'bg-green-100 text-green-500' 
                    : kycStatus === 'rejected' 
                      ? 'bg-red-100 text-red-500'
                      : 'bg-yellow-100 text-yellow-500'
                }`}>
                  {kycStatus === 'verified' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : kycStatus === 'rejected' ? (
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
                    kycStatus === 'verified' 
                      ? 'text-green-500' 
                      : kycStatus === 'rejected' 
                        ? 'text-red-500'
                        : 'text-yellow-500'
                  }`}>
                    {kycStatus === 'verified' 
                      ? 'Verified' 
                      : kycStatus === 'rejected' 
                        ? 'Verification Failed'
                        : 'Pending Verification'}
                  </p>
                </div>
              </div>
              
              <p className="text-gray-600 text-sm mb-4">
                {kycStatus === 'verified' 
                  ? 'Your identity has been verified. You now have full access to all features.' 
                  : kycStatus === 'rejected' 
                    ? 'Your verification was not successful. Please try again with valid documents.'
                    : ''}
              </p>
              
              {kycStatus !== 'verified' && (
                <div className="flex flex-col space-y-3 mb-6">
                  <button
                    onClick={launchSelfVerification}
                    className="w-full py-3 px-4 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors"
                  >
                    Complete Verification
                  </button>
                </div>
              )}
            </div>
            
            {/* Skip Button */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex flex-col items-center">
                <button 
                  onClick={handleSkip} 
                  className="py-2 px-4 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm"
                >
                  Skip for Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 