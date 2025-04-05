import { useState } from 'react';
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
    localStorage.setItem('bypassRestriction', 'true');
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
            
            {isSubmitted ? (
              <div className="text-center py-4">
                <div className="rounded-full bg-green-100 p-3 inline-flex mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Request Submitted</h3>
                <p className="text-gray-600 mb-4">We've received your access request. Please ask an existing user to add you to the whitelist. We'll notify you when you've been granted access.</p>
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="py-2 px-4 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
                >
                  Submit Another Request
                </button>
              </div>
            ) : (
              <form onSubmit={handleRequestAccess} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="you@example.com"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">We'll notify you at this email when you've been added to the whitelist.</p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg mb-2">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        Ask an existing user to add you to the whitelist. They can do this from their account settings.
                      </p>
                    </div>
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={isSubmitting || !email}
                  className={`w-full py-3 px-4 ${
                    isSubmitting || !email ? 'bg-indigo-300' : 'bg-indigo-500 hover:bg-indigo-600'
                  } text-white rounded-xl transition-colors flex justify-center items-center`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : 'Request Access'}
                </button>
              </form>
            )}
            
            {/* Temporary Skip Button - to be removed in production */}
            <div className="mt-8 pt-4 border-t border-gray-100">
              <div className="flex flex-col items-center">
                <p className="text-xs text-gray-400 mb-2">Developer Testing Only</p>
                <button 
                  onClick={handleSkipForTesting} 
                  className="py-2 px-4 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Skip for Testing
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
