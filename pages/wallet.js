import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useMiniKitContext } from '../contexts/MiniKitContext';

export default function Wallet() {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { 
    isInstalled, 
    username, 
    isLoading, 
    walletAuthenticated, 
    walletAddress,
    initiateWalletAuth,
    logout,
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

      <main className="max-w-[480px] mx-auto px-5 py-4 pb-16 relative min-h-screen overflow-auto">
        {/* Header */}
        <header className="flex justify-between items-center py-3">
          <h1 className="text-lg font-semibold text-gray-800">Wallet</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{username}</span>
            <button 
              onClick={() => router.push('/profile')}
              className="bg-white rounded-full p-2 shadow-sm"
            >
              <Image src="/profile.svg" alt="Profile" width={28} height={28} />
            </button>
          </div>
        </header>

        {/* Wallet Content */}
        <div className="mt-6 flex flex-col items-center">
          <div className="w-full p-6 bg-white rounded-2xl shadow-sm">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Your Wallet</h3>
            
            {walletAuthenticated ? (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl p-6 text-white transform transition-transform hover:scale-[1.01]">
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
                
                {/* Transaction History (Sample) */}
                <div className="mt-6">
                  <h4 className="text-md font-medium text-gray-700 mb-3">Recent Activity</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 border border-gray-100 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-2 rounded-full">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 16L12 8" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M9 11L12 8 15 11" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Received</p>
                          <p className="text-xs text-gray-500">March 15, 2023</p>
                        </div>
                      </div>
                      <p className="text-green-500 font-medium">+$200.00</p>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 border border-gray-100 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="bg-red-100 p-2 rounded-full">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 8L12 16" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M9 13L12 16 15 13" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Sent</p>
                          <p className="text-xs text-gray-500">March 10, 2023</p>
                        </div>
                      </div>
                      <p className="text-red-500 font-medium">-$50.00</p>
                    </div>
                  </div>
                </div>
                
                {/* Disconnect Button */}
                <button 
                  onClick={() => setShowLogoutConfirm(true)}
                  className="mt-6 w-full py-2 px-4 rounded-xl border border-red-500 text-red-500 hover:bg-red-50 transition-colors flex justify-center items-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Disconnect Wallet
                </button>
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
        <nav className="fixed bottom-0 left-0 right-0 flex justify-around py-3 px-4 bg-white shadow-sm max-w-[480px] mx-auto border-t border-gray-100">
          <button 
            onClick={() => router.push('/portfolio')}
            className="p-2 text-gray-500 hover:text-indigo-500 transition-colors"
          >
            <Image src="/portfolio.svg" alt="Portfolio" width={20} height={20} />
          </button>
          <button 
            onClick={() => router.push('/')}
            className="p-2 text-gray-500 hover:text-indigo-500 transition-colors"
          >
            <Image src="/home.svg" alt="Home" width={20} height={20} />
          </button>
          <button className="p-2 text-indigo-500">
            <Image src="/wallet.svg" alt="Wallet" width={20} height={20} />
          </button>
        </nav>
      </main>
    </div>
  );
} 