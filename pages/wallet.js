import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useMiniKitContext } from '../contexts/MiniKitContext';

export default function Wallet() {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  const { 
    isInstalled, 
    username, 
    isLoading, 
    walletAuthenticated, 
    walletAddress,
    initiateWalletAuth,
    balance 
  } = useMiniKitContext();

  // Format wallet address for display
  const formatWalletAddress = (address) => {
    if (!address) return 'Not connected';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Handle wallet connection with loading state
  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      await initiateWalletAuth();
    } catch (error) {
      console.error("Failed to connect wallet:", error);
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

  return (
    <div className="min-h-screen bg-gray-50 font-['Inter']">
      <Head>
        <title>Wallet - Lend & Borrow</title>
        <meta name="description" content="User wallet page" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="max-w-[480px] mx-auto px-5 py-4 relative min-h-screen">
        {/* Header */}
        <header className="flex justify-between items-center py-4">
          <h1 className="text-lg font-semibold text-gray-800">Wallet</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{username}</span>
            <button 
              onClick={() => router.push('/profile')}
              className="bg-white rounded-full p-2 shadow-sm"
            >
              <Image src="/profile.svg" alt="Profile" width={32} height={32} />
            </button>
          </div>
        </header>

        {/* Wallet Content */}
        <div className="mt-8 flex flex-col items-center">
          <div className="w-full p-6 bg-white rounded-2xl shadow-sm">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Your Wallet</h3>
            
            {walletAuthenticated ? (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl p-6 text-white">
                  <p className="text-sm opacity-80 mb-2">Wallet Address</p>
                  <p className="font-mono text-sm">{formatWalletAddress(walletAddress)}</p>
                  <p className="text-sm opacity-80 mt-4 mb-2">Balance</p>
                  <p className="text-xl font-bold">${balance} USD</p>
                </div>
                
                <p className="text-green-500 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Wallet Connected
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600 mb-4">Connect your wallet to access lending and borrowing features.</p>
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
                      Connecting...
                    </>
                  ) : 'Connect Wallet'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 flex justify-around p-4 bg-white shadow-sm max-w-[480px] mx-auto">
          <button 
            onClick={() => router.push('/portfolio')}
            className="p-2 text-gray-500 hover:text-indigo-500 transition-colors"
          >
            <Image src="/portfolio.svg" alt="Portfolio" width={24} height={24} />
          </button>
          <button 
            onClick={() => router.push('/')}
            className="p-2 text-gray-500 hover:text-indigo-500 transition-colors"
          >
            <Image src="/home.svg" alt="Home" width={24} height={24} />
          </button>
          <button 
            className="p-2 text-indigo-500"
          >
            <Image src="/wallet.svg" alt="Wallet" width={24} height={24} />
          </button>
        </nav>
      </main>
    </div>
  );
} 