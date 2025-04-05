import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useMiniKitContext } from '../contexts/MiniKitContext';
import { useReadContract, useAccount, useChainId } from 'wagmi';
import UserProfileABI from '../contracts/abi/profile.json';

export default function Restricted() {
  const router = useRouter();
  const { username, walletAddress: contextWalletAddress, profilePicture } = useMiniKitContext();
  const { address: wagmiAddress, isConnected } = useAccount();
  const chainId = useChainId();
  
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [referrer, setReferrer] = useState(null);
  const [manualAddress, setManualAddress] = useState('');
  const [addressToCheck, setAddressToCheck] = useState('');
  
  // Determine which wallet address to use
  const effectiveWalletAddress = wagmiAddress || contextWalletAddress;
  
  // Get the contract address from environment variable
  const contractAddress = process.env.NEXT_PUBLIC_PROFILE_CONTRACT_ADDRESS;
  
  console.log('Debug - Contract Address:', contractAddress);
  console.log('Debug - Context Wallet Address:', contextWalletAddress);
  console.log('Debug - Wagmi Wallet Address:', wagmiAddress);
  console.log('Debug - Chain ID:', chainId);
  console.log('Debug - Expected Chain ID:', 4801);
  
  // Ensure wallet address is in the correct format
  const formattedWalletAddress = effectiveWalletAddress && effectiveWalletAddress.startsWith('0x') 
    ? effectiveWalletAddress 
    : effectiveWalletAddress 
      ? `0x${effectiveWalletAddress}` 
      : undefined;
  
  // Set the address to check - either the wallet address or a manual one
  const addressForQuery = addressToCheck || formattedWalletAddress;
  
  // Read the referrer from the contract
  const {
    data: referrerAddress,
    isError,
    isLoading: isReferrerLoading,
    error,
    refetch
  } = useReadContract({
    address: contractAddress,
    abi: UserProfileABI,
    functionName: 'getReferrer',
    args: addressForQuery ? [addressForQuery] : undefined,
    enabled: Boolean(contractAddress && addressForQuery && chainId === 4801),
  });
  
  // Manual refetch on initial load or when address changes
  useEffect(() => {
    if (addressForQuery && contractAddress && chainId === 4801) {
      console.log("Triggering refetch with address:", addressForQuery);
      refetch();
    }
  }, [addressForQuery, contractAddress, chainId, refetch]);
  
  console.log('Debug - Address for query:', addressForQuery);
  console.log('Debug - referrerAddress data:', referrerAddress);
  console.log('Debug - isError:', isError);
  console.log('Debug - error details:', error);
  
  // Check if the user is referred and set the referrer
  useEffect(() => {
    if (referrerAddress && referrerAddress !== '0x0000000000000000000000000000000000000000') {
      console.log("Referrer found:", referrerAddress);
      // Get the shortened address for display
      const shortAddress = `${referrerAddress.slice(0, 6)}...${referrerAddress.slice(-4)}`;
      setReferrer(shortAddress);
    } else {
      console.log("No referrer found or zero address:", referrerAddress);
    }
  }, [referrerAddress]);
  
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
  
  // Handle manual refetch
  const handleRefetchReferrer = () => {
    console.log("Manual refetch triggered");
    refetch();
  };
  
  // Handle manual address input
  const handleManualAddressSubmit = (e) => {
    e.preventDefault();
    if (manualAddress) {
      const formattedAddress = manualAddress.startsWith('0x') 
        ? manualAddress 
        : `0x${manualAddress}`;
      
      console.log("Manually checking address:", formattedAddress);
      setAddressToCheck(formattedAddress);
    }
  };
  
  // Reset to user's wallet address
  const handleResetToWalletAddress = () => {
    setAddressToCheck('');
    setManualAddress('');
  };
  
  // Handle navigation to KYC (only when user explicitly clicks the button)
  const handleGoToKYC = () => {
    router.push('/kyc');
  };

  const goToHomePage = () => {
    router.push('/');
  };

  const isCorrectChain = chainId === 4801;

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
            {isReferrerLoading || !isCorrectChain ? (
              <div className="flex flex-col items-center justify-center py-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">Checking Access</h2>
                
                {/* Network Check */}
                {!isCorrectChain ? (
                  <div className="w-full max-w-sm">
                    <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-6">
                      <p className="text-red-800 text-sm font-medium">Wrong Network</p>
                      <p className="text-red-600 text-xs mt-1">Please connect to World Chain Sepolia (Chain ID: 4801)</p>
                    </div>
                  </div>
                ) : (
                  /* Three Dots Wave Loading Animation */
                  <div className="flex space-x-2 justify-center items-center">
                    <div className="h-2.5 w-2.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="h-2.5 w-2.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="h-2.5 w-2.5 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                )}
              </div>
            ) : referrer ? (
              /* User has a referrer - show success and KYC button */
              <div className="flex flex-col items-center text-center">
                <div className="rounded-full bg-green-100 p-3 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Granted</h2>
                <p className="text-gray-600 mb-6">You have been referred by {referrer}</p>
                
                <div className="mt-4 mb-4 p-4 bg-blue-50 border border-blue-100 rounded-lg w-full max-w-sm">
                  <p className="text-sm text-blue-800 text-center">
                    <span className="font-semibold">Next Step:</span> Complete KYC verification
                  </p>
                </div>
                
                <button 
                  onClick={handleGoToKYC} 
                  className="py-3 px-8 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium mt-4"
                >
                  Proceed to KYC
                </button>
              </div>
            ) : (
              /* No referrer - show restricted message */
              <div className="flex flex-col items-center text-center">
                <div className="rounded-full bg-red-100 p-3 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-4V8m0 0V6m0 0h2m-2 0H9" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Restricted</h2>
                <p className="text-gray-600 mb-1">This app is currently whitelist-only.</p>
                <p className="text-gray-600 mb-6">You need to be added to the whitelist by an existing user to access this app.</p>
                
                <div className="w-full max-w-sm bg-yellow-50 border border-yellow-100 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm text-center font-medium">No referrer found for your account</p>
                  <p className="text-yellow-700 text-xs mt-2 text-center">Please contact an existing member to get referred.</p>
                </div>
              </div>
            )}
            
            {/* Debug Panel - Only shown in development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-8 border-t border-gray-100 pt-4">
                <details className="text-xs">
                  <summary className="font-medium text-gray-500 cursor-pointer">Debug Information</summary>
                  <div className="mt-4 p-3 bg-gray-100 rounded-lg text-xs overflow-auto">
                    <div><strong>Connected:</strong> {isConnected ? 'Yes' : 'No'}</div>
                    <div><strong>Chain ID:</strong> {chainId || 'Not connected'} (Expected: 4801)</div>
                    <div><strong>Context Address:</strong> {contextWalletAddress || 'Not available'}</div>
                    <div><strong>Wagmi Address:</strong> {wagmiAddress || 'Not available'}</div>
                    <div><strong>Using Address:</strong> {addressForQuery || 'N/A'}</div>
                    <div><strong>Contract:</strong> {contractAddress || 'Not found'}</div>
                    {isError && <div className="text-red-500"><strong>Error:</strong> {error?.message || 'Unknown error'}</div>}
                    <button 
                      onClick={refetch}
                      className="mt-2 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                      disabled={!isCorrectChain}
                    >
                      Retry
                    </button>
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
