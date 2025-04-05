import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useMiniKitContext } from '../contexts/MiniKitContext';

export default function Restricted() {
  const router = useRouter();
  const { username, profilePicture } = useMiniKitContext();
  
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [countdown, setCountdown] = useState(3);
  
  // Auto-redirect to KYC page after a brief delay (for testing)
  useEffect(() => {
    // Only start the countdown if we're on the client side
    if (typeof window === 'undefined') return;
    
    const timer = setInterval(() => {
      setCountdown((prevCount) => {
        if (prevCount <= 1) {
          clearInterval(timer);
          // Auto-navigate to KYC after countdown
          handleSkipForTesting();
          return 0;
        }
        return prevCount - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Handle access request submission
  const handleRequestAccess = (e) => {
    e.preventDefault();
    
    if (!email) return;
    
    setIsSubmitting(true);
    
    // In a real app, you would send this data to your backend
    setTimeout(() => {
      console.log('Access request submitted:', { email });
      setIsSubmitting(false);
      setIsSubmitted(true);
      
      // Reset form
      setEmail('');
    }, 1000);
  };
  
  // Handle skip for testing (temporary)
  const handleSkipForTesting = () => {
    // In the future, this will be removed and proper authentication will be required
    // Don't save to localStorage in testing mode
    // localStorage.setItem('bypassRestriction', 'true');
    // localStorage.setItem('hasReferral', 'true');
    router.push('/kyc');
  };

  const goToHomePage = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 font-['Inter']">
      <Head>
        <title>Access Restricted - World Super App</title>
        <meta name="description" content="Request access to World Super App" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
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
            <h1 className="text-2xl font-bold text-white">World Super App</h1>
          </div>
          
          {/* Restricted Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mt-4">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="rounded-full bg-red-100 p-3 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-4V8m0 0V6m0 0h2m-2 0H9" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Restricted</h2>
              <p className="text-gray-600 mb-1">This app is currently whitelist-only.</p>
              <p className="text-gray-600">You need to be added to the whitelist by an existing user to access this app.</p>
            </div>
            
            {/* Auto-redirect Countdown */}
            <div className="mt-4 text-center">
              <p className="text-sm text-indigo-600">
                Redirecting to KYC in <span className="font-semibold">{countdown}</span> seconds...
              </p>
            </div>
            
            {/* Temporary Skip Button - to be removed in production */}
            <div className="mt-8 pt-4 border-t border-gray-100">
              <div className="flex flex-col items-center">
                <p className="text-xs text-gray-400 mb-2">Developer Testing Only</p>
                <button 
                  onClick={handleSkipForTesting} 
                  className="py-2 px-4 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm"
                >
                  Skip Waiting
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
