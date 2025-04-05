import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useMiniKitContext } from '../contexts/MiniKitContext';
import { v4 as uuidv4 } from 'uuid';

export default function Profile() {
  const router = useRouter();
  const { 
    isInstalled, 
    username, 
    profilePicture, 
    isLoading,
    walletAuthenticated,
    walletAddress,
    initiateWalletAuth,
    logout,
    referUser,
    totalReferrals: contextTotalReferrals = 0
  } = useMiniKitContext();
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('account'); // 'account', 'referrals'
  const [referralUsername, setReferralUsername] = useState('');
  const [referralSubmitting, setReferralSubmitting] = useState(false);
  const [referralSuccess, setReferralSuccess] = useState(false);
  const [totalReferrals, setTotalReferrals] = useState(contextTotalReferrals);
  const [isResolvingUsername, setIsResolvingUsername] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [txHash, setTxHash] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Update total referrals from context
      setTotalReferrals(contextTotalReferrals);
    }
  }, [contextTotalReferrals]);
  
  // Handle username resolution
  const resolveUsername = async (username) => {
    if (!username || username.length < 3) {
      setResolvedAddress('');
      setUsernameError('');
      return;
    }
    
    setIsResolvingUsername(true);
    setUsernameError('');
    setResolvedAddress('');
    
    try {
      const response = await fetch(`https://usernames.worldcoin.org/api/v1/${username}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setUsernameError('Username not found');
        } else {
          setUsernameError('Error resolving username');
        }
        setResolvedAddress('');
        setIsResolvingUsername(false);
        return;
      }
      
      const data = await response.json();
      if (data.address) {
        setResolvedAddress(data.address);
        setUsernameError('');
      } else {
        setUsernameError('Invalid username data received');
        setResolvedAddress('');
      }
    } catch (error) {
      console.error('Error resolving username:', error);
      setUsernameError('Error resolving username');
      setResolvedAddress('');
    } finally {
      setIsResolvingUsername(false);
    }
  };
  
  // Handle referral input change
  const handleReferralUsernameChange = (e) => {
    const value = e.target.value;
    setReferralUsername(value);
    
    // Debounce username resolution with a slight delay
    const timeoutId = setTimeout(() => {
      if (value && value.length >= 3) {
        resolveUsername(value);
      } else {
        setResolvedAddress('');
        setUsernameError('');
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  };

  // Handle refer user submission
  const handleReferUser = async (e) => {
    e.preventDefault();
    
    if (!referralUsername.trim()) return;
    
    setReferralSubmitting(true);
    setTxHash('');
    setUsernameError('');
    
    try {
      // Call the referUser function from context
      console.log('Referring user:', referralUsername);
      const result = await referUser(referralUsername);
      console.log('Referral result:', result);
      
      if (result.success) {
        setReferralSuccess(true);
        setTotalReferrals(result.totalReferrals);
        
        // Store the transaction hash if available
        if (result.txHash) {
          setTxHash(result.txHash);
        }
        
        // Clear form
        setReferralUsername('');
        setResolvedAddress('');
        
        // Reset success message after delay
        setTimeout(() => {
          setReferralSuccess(false);
        }, 8000);
      } else {
        // Handle error
        setUsernameError(result.message || 'Failed to refer user');
      }
    } catch (error) {
      console.error('Error referring user:', error);
      setUsernameError('An error occurred while referring the user');
    } finally {
      setReferralSubmitting(false);
    }
  };

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
                onClick={() => setActiveTab('referrals')}
                className={`flex-1 py-2 text-center text-sm font-medium ${activeTab === 'referrals' ? 'text-indigo-600 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Referrals
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
                <span className="text-gray-600">Member Since</span>
                <span className="font-medium">April 2023</span>
              </div>
            </div>
          )}
          
          {/* Referrals Tab */}
          {activeTab === 'referrals' && (
            <div className="mt-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h3 className="text-lg font-medium text-gray-800 mb-2">Refer Friends</h3>
                <p className="text-sm text-gray-600 mb-4">Invite friends to join SuperWorld App using their World username.</p>
                
                {/* Referral Form */}
                <form onSubmit={handleReferUser} className="mt-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Friend's World Username
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={referralUsername}
                        onChange={handleReferralUsernameChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Enter friend's username"
                        disabled={referralSubmitting}
                        required
                      />
                      {isResolvingUsername && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      )}
                      {resolvedAddress && !isResolvingUsername && !usernameError && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      )}
                      {usernameError && !isResolvingUsername && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {resolvedAddress && (
                      <p className="text-xs text-gray-600 mt-1">
                        <span className="mr-1">Address:</span>
                        <span className="font-mono text-xs truncate">{resolvedAddress}</span>
                      </p>
                    )}
                    {usernameError && (
                      <p className="text-xs text-red-500 mt-1">{usernameError}</p>
                    )}
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={referralSubmitting || !resolvedAddress || !!usernameError}
                    className={`w-full py-3 px-4 ${
                      referralSubmitting || !resolvedAddress || !!usernameError
                        ? 'bg-indigo-300' 
                        : 'bg-indigo-500 hover:bg-indigo-600'
                    } text-white rounded-xl transition-colors flex justify-center items-center`}
                  >
                    {referralSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Referring...
                      </>
                    ) : 'Refer Friend'}
                  </button>
                </form>
                
                {/* Success message */}
                {referralSuccess && (
                  <div className="mt-4 bg-green-50 text-green-800 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="font-medium">Request Processed!</p>
                    </div>
                    <p className="text-sm text-green-700 mb-2">
                      For this test environment, a mock transaction was generated. In the real World App, users would see a transaction signing prompt.
                    </p>
                    {txHash && (
                      <div className="mt-2 bg-green-100 p-2 rounded-md">
                        <p className="text-xs text-green-800 font-medium mb-1">Test Transaction Hash:</p>
                        <p className="font-mono text-xs break-all">{txHash}</p>
                        <p className="text-xs mt-2 text-green-700 italic">
                          This is a test transaction hash for demonstration purposes. Real transactions would be sent to World Chain Sepolia (chain ID 4801).
                        </p>
                      </div>
                    )}
                  </div>
                )}
               
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