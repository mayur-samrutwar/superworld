import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useMiniKitContext } from '../contexts/MiniKitContext';

export default function Home() {
  const router = useRouter();
  const { 
    isInstalled, 
    username, 
    isLoading, 
    walletAuthenticated, 
    initiateWalletAuth,
    balance,
    hasReferral 
  } = useMiniKitContext();
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

  // Redirect authenticated users to restricted page first, then KYC (for testing)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check if we have the special parameters from the KYC page
    const urlParams = new URLSearchParams(window.location.search);
    const fromKyc = urlParams.get('fromKyc') === 'true';
    const verified = urlParams.get('verified') === 'true';
    
    // If we're coming from KYC with verification, don't redirect
    if (fromKyc && verified) {
      console.log('Coming from KYC verification, skipping redirection check');
      return;
    }
    
    // First time authentication goes to restricted page
    if (walletAuthenticated) {
      router.push('/restricted');
    }
  }, [walletAuthenticated, router]);

  // Handle wallet connection with loading state
  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      const success = await initiateWalletAuth();
      // After successful sign-in, redirect to restricted page first
      if (success) {
        router.push('/restricted');
      }
    } catch (error) {
      console.error("Failed to sign in:", error);
    } finally {
      setIsConnecting(false);
    }
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
          <h1 className="text-2xl font-semibold text-gray-800 mb-4">Welcome to Lend & Borrow</h1>
          <p className="text-gray-600 mb-6">Please open this app in World App to continue</p>
          <p className="text-sm text-gray-500">MiniKit not detected. Check console for details.</p>
        </div>
      </div>
    );
  }

  // For testing: If user is coming from verified KYC with special URL params, show the main app
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const fromKyc = urlParams ? urlParams.get('fromKyc') === 'true' : false;
  const verified = urlParams ? urlParams.get('verified') === 'true' : false;
  
  if (walletAuthenticated && fromKyc && verified) {
    return (
      <div className="min-h-screen bg-gray-50 font-['Inter']">
        <Head>
          <title>World Super App</title>
          <meta name="description" content="Financial super app powered by World" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <main className="max-w-[480px] mx-auto px-5 pt-4 pb-20 relative min-h-screen overflow-auto">
          {/* Header */}
          <header className="flex justify-between items-center py-3 sticky top-0 bg-gray-50 z-10">
            <div className="bg-white rounded-full p-2 shadow-sm">
              <Image src="/notification.svg" alt="Notifications" width={20} height={20} />
            </div>
            <button 
              onClick={() => router.push('/profile')}
              className="bg-white rounded-full p-2 shadow-sm"
            >
              <Image src="/profile.svg" alt="Profile" width={28} height={28} />
            </button>
          </header>

          {/* Balance Card */}
          <div className="bg-white rounded-3xl p-6 mt-3 mb-5 shadow-md transform transition-transform hover:scale-[1.01]">
            <div className="relative">
              <h2 className="text-sm text-gray-500 mb-2">Total Balance</h2>
              <h1 className="text-3xl font-semibold text-gray-800">
                {showBalance ? `$${balance}` : '••••••'}
              </h1>
              <button 
                className="absolute right-0 top-1/2 -translate-y-1/2 p-2"
                onClick={() => setShowBalance(!showBalance)}
              >
                {showBalance ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-center hover:shadow-md transition-all">
                <div className="text-indigo-500 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1v22"></path>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    <path d="M14 12H9"></path>
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-800">Pay</span>
              </div>
              
              <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-center hover:shadow-md transition-all">
                <div className="text-emerald-500 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="6" width="20" height="12" rx="2"></rect>
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M17 12h.01"></path>
                    <path d="M7 12h.01"></path>
                    <path d="M17 8v-.5a2.5 2.5 0 0 0-5 0V8"></path>
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-800">Lend</span>
              </div>
              
              <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-center hover:shadow-md transition-all">
                <div className="text-purple-500 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                    <line x1="9" y1="9" x2="9.01" y2="9"></line>
                    <line x1="15" y1="9" x2="15.01" y2="9"></line>
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-800">Borrow</span>
              </div>
            </div>
          </div>

          {/* Welcome Message */}
          <div className="bg-white p-6 rounded-2xl shadow-sm mb-12">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Welcome to SuperWorld!</h2>
            <p className="text-gray-600">
              You have successfully completed onboarding. You now have access to all features of the app.
            </p>
          </div>

          {/* Bottom Navigation */}
          <nav className="fixed bottom-0 left-0 right-0 flex justify-around items-center h-14 bg-white shadow-md max-w-[480px] mx-auto border-t border-gray-100">
            <button className="w-1/3 flex items-center justify-center">
              <Image src="/portfolio.svg" alt="Portfolio" width={24} height={24} />
            </button>
            <button className="w-1/3 flex items-center justify-center">
              <Image src="/home.svg" alt="Home" width={24} height={24} className="text-indigo-500" />
            </button>
            <button className="w-1/3 flex items-center justify-center">
              <Image src="/wallet.svg" alt="Wallet" width={24} height={24} />
            </button>
          </nav>
        </main>
      </div>
    );
  }

  // Only show sign-in page if not authenticated
  return (
    <div className="min-h-screen bg-gray-50 font-['Inter']">
      <Head>
        <title>World Super App</title>
        <meta name="description" content="Financial super app powered by World" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="max-w-[480px] mx-auto px-5 py-4 relative min-h-screen flex flex-col items-center justify-center">
        <div className="w-64 h-64 mb-8 flex justify-center items-center">
          <Image 
            src="/icon-money-3d-illustration-png.png" 
            alt="Money Illustration" 
            width={220}
            height={220}
            className="object-contain"
            priority
          />
        </div>
        
        <h1 className="text-2xl font-semibold text-gray-800 mb-3 text-center">Welcome to SuperWorld</h1>
        <p className="text-gray-600 mb-8 text-center max-w-xs">The only financial super app you need</p>
        
        <button
          onClick={handleConnectWallet}
          disabled={isConnecting}
          className={`w-full max-w-xs ${isConnecting ? 'bg-indigo-400' : 'bg-indigo-500 hover:bg-indigo-600'} text-white py-3 px-4 rounded-xl transition-colors flex justify-center items-center mb-8`}
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
        
        <p className="text-sm text-gray-500 text-center">
          By connecting, you'll access all financial features of the Super App
        </p>
      </main>
    </div>
  );
}
