import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useMiniKitContext } from '../contexts/MiniKitContext';
import { getUniversalLink, SelfAppBuilder } from '@selfxyz/core';
import { v4 as uuidv4 } from 'uuid';

export default function Profile() {
  const router = useRouter();
  const { 
    isInstalled, 
    username, 
    profilePicture, 
    isLoading,
    walletAuthenticated,
    initiateWalletAuth,
    logout
  } = useMiniKitContext();
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [kycStatus, setKycStatus] = useState('pending'); // 'pending', 'verified', 'rejected'
  const [showDeepLinkMessage, setShowDeepLinkMessage] = useState(false);
  const [activeTab, setActiveTab] = useState('account'); // 'account', 'kyc', 'security'

  // Check for verification status update
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

  // Handle wallet connection with loading state
  const handleConnectWallet = async () => {
    try {
      setIsConnecting(true);
      await initiateWalletAuth();
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setIsConnecting(false);
    }
  };
  
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
  
  // Handle logout
  const handleLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm max-w-sm w-full text-center">
          <h1 className="text-2xl font-semibold text-gray-800 mb-4">Loading...</h1>
          <p className="text-gray-600 mb-6">Please wait while we connect to World App</p>
        </div>
      </div>
    );
  }

  if (!isInstalled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm max-w-sm w-full text-center">
          <h1 className="text-2xl font-semibold text-gray-800 mb-4">Welcome to World Super App</h1>
          <p className="text-gray-600 mb-6">Please open this app in World App to continue</p>
          <p className="text-sm text-gray-500">MiniKit not detected. Check console for details.</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show authentication prompt
  if (!walletAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 font-['Inter']">
        <Head>
          <title>Your Profile - World Super App</title>
          <meta name="description" content="User profile in World Super App" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <main className="max-w-[480px] mx-auto px-5 py-4 pb-20 relative min-h-screen">
          {/* Header */}
          <header className="flex justify-between items-center py-3">
            <button 
              onClick={() => router.back()}
              className="bg-white rounded-full p-2 shadow-sm"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.41 16.59L10.83 12L15.41 7.41L14 6L8 12L14 18L15.41 16.59Z" fill="#4B5563"/>
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-800">Profile</h1>
            <div className="w-10"></div> {/* Placeholder for alignment */}
          </header>

          <div className="mt-20 flex flex-col items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-sm max-w-sm w-full text-center">
              <div className="mb-6">
                <Image 
                  src="/icon-money-3d-illustration-png.png"
                  alt="Money Illustration" 
                  width={160}
                  height={160}
                  className="mx-auto object-contain"
                  priority
                />
              </div>
              <h1 className="text-2xl font-semibold text-gray-800 mb-4">Sign In Required</h1>
              <p className="text-gray-600 mb-6">Connect your wallet to access your profile</p>
              
              <button
                onClick={handleConnectWallet}
                disabled={isConnecting}
                className={`w-full ${isConnecting ? 'bg-indigo-400' : 'bg-indigo-500 hover:bg-indigo-600'} text-white py-3 px-4 rounded-xl transition-colors flex justify-center items-center`}
              >
                {isConnecting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : 'Sign in'}
              </button>
            </div>
          </div>

          {/* Bottom Navigation - Simplified */}
          <nav className="fixed bottom-0 left-0 right-0 flex justify-around items-center h-14 bg-white shadow-md max-w-[480px] mx-auto border-t border-gray-100">
            <button 
              onClick={() => router.push('/portfolio')}
              className="w-1/3 flex items-center justify-center"
            >
              <Image src="/portfolio.svg" alt="Portfolio" width={24} height={24} />
            </button>
            <button 
              onClick={() => router.push('/')}
              className="w-1/3 flex items-center justify-center"
            >
              <Image src="/home.svg" alt="Home" width={24} height={24} />
            </button>
            <button 
              onClick={() => router.push('/wallet')}
              className="w-1/3 flex items-center justify-center"
            >
              <Image src="/wallet.svg" alt="Wallet" width={24} height={24} />
            </button>
          </nav>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-['Inter']">
      <Head>
        <title>Your Profile - World Super App</title>
        <meta name="description" content="User profile in World Super App" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center">
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Logout Confirmation</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to disconnect your wallet?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-gray-100 py-2 px-4 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleLogout}
                className="flex-1 bg-red-500 text-white py-2 px-4 rounded-xl hover:bg-red-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

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

      <main className="max-w-[480px] mx-auto px-5 py-4 pb-20 relative min-h-screen overflow-auto">
        {/* Header */}
        <header className="flex justify-between items-center py-3">
          <button 
            onClick={() => router.back()}
            className="bg-white rounded-full p-2 shadow-sm"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.41 16.59L10.83 12L15.41 7.41L14 6L8 12L14 18L15.41 16.59Z" fill="#4B5563"/>
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-800">Profile</h1>
          <div className="w-10"></div> {/* Placeholder for alignment */}
        </header>

        {/* Profile Content */}
        <div className="mt-8 flex flex-col items-center">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full p-1 shadow-lg">
            <div className="bg-white rounded-full p-1">
              <div className="relative w-24 h-24 rounded-full overflow-hidden">
                <Image 
                  src={profilePicture}
                  alt="Profile" 
                  width={96}
                  height={96}
                  layout="responsive"
                />
              </div>
            </div>
          </div>
          
          <h2 className="mt-6 text-2xl font-semibold text-gray-800">{username}</h2>
          <p className="mt-2 text-gray-500">World Super App User</p>
          
          {/* Profile Tabs */}
          <div className="w-full mt-8 mb-4">
            <div className="flex border-b border-gray-200">
              <button 
                onClick={() => setActiveTab('account')}
                className={`flex-1 py-2 text-center text-sm font-medium ${activeTab === 'account' ? 'text-indigo-600 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Account
              </button>
              <button 
                onClick={() => setActiveTab('kyc')}
                className={`flex-1 py-2 text-center text-sm font-medium ${activeTab === 'kyc' ? 'text-indigo-600 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-700'}`}
              >
                KYC
              </button>
            </div>
          </div>
          
          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="w-full p-6 bg-white rounded-2xl shadow-sm">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Account Details</h3>
              
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600">Username</span>
                <span className="font-medium">{username}</span>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <span className="text-gray-600">Verification</span>
                <span className="text-green-500 font-medium">Verified</span>
              </div>
              
              <div className="flex justify-between items-center py-3">
                <span className="text-gray-600">Member Since</span>
                <span className="font-medium">April 2023</span>
              </div>
            </div>
          )}
          
          {/* KYC Tab */}
          {activeTab === 'kyc' && (
            <div className="w-full p-6 bg-white rounded-2xl shadow-sm">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Identity Verification</h3>
              
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
                    <h4 className="font-medium text-gray-800">KYC Status</h4>
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
                      : 'Complete the verification process to unlock all features and increase your transaction limits.'}
                </p>
                
                {kycStatus !== 'verified' && (
                  <div className="flex flex-col space-y-3">
                    <button
                      onClick={launchSelfVerification}
                      className="w-full py-3 px-4 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors"
                    >
                      Complete Verification
                    </button>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h4 className="font-medium text-gray-800 mb-3">Verification Benefits</h4>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-gray-600">
                    <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Higher transaction limits
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Access to premium features
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Enhanced account security
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Lower transaction fees
                  </li>
                </ul>
              </div>
            </div>
          )}
          
          {/* Logout Button */}
          <button 
            onClick={() => setShowLogoutConfirm(true)}
            className="mt-8 w-full py-3 px-4 rounded-xl border border-red-500 text-red-500 hover:bg-red-50 transition-colors flex justify-center items-center gap-2 mb-12"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Logout
          </button>
        </div>

        {/* Bottom Navigation - Simplified */}
        <nav className="fixed bottom-0 left-0 right-0 flex justify-around items-center h-14 bg-white shadow-md max-w-[480px] mx-auto border-t border-gray-100">
          <button 
            onClick={() => router.push('/portfolio')}
            className="w-1/3 flex items-center justify-center"
          >
            <Image src="/portfolio.svg" alt="Portfolio" width={24} height={24} />
          </button>
          <button 
            onClick={() => router.push('/')}
            className="w-1/3 flex items-center justify-center"
          >
            <Image src="/home.svg" alt="Home" width={24} height={24} />
          </button>
          <button 
            onClick={() => router.push('/wallet')}
            className="w-1/3 flex items-center justify-center"
          >
            <Image src="/wallet.svg" alt="Wallet" width={24} height={24} />
          </button>
        </nav>
      </main>
    </div>
  );
} 