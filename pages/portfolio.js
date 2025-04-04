import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useMiniKitContext } from '../contexts/MiniKitContext';

export default function Portfolio() {
  const router = useRouter();
  const { isInstalled, username, isLoading, walletAuthenticated, initiateWalletAuth, balance } = useMiniKitContext();
  const [activeTab, setActiveTab] = useState('investments');
  const [isConnecting, setIsConnecting] = useState(false);

  // Handle wallet connection with loading state
  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      await initiateWalletAuth();
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
          <h1 className="text-2xl font-semibold text-gray-800 mb-4">Welcome to World Super App</h1>
          <p className="text-gray-600 mb-6">Please open this app in World App to continue</p>
          <p className="text-sm text-gray-500">MiniKit not detected. Check console for details.</p>
        </div>
      </div>
    );
  }

  // Show authentication page if not authenticated
  if (!walletAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 font-['Inter']">
        <Head>
          <title>Portfolio - World Super App</title>
          <meta name="description" content="View and manage your investments" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <main className="max-w-[480px] mx-auto px-5 py-4 relative min-h-screen flex flex-col items-center justify-center">
          <div className="w-64 h-64 mb-8">
            <Image 
              src="/portfolio.svg" 
              alt="Portfolio" 
              width={256} 
              height={256} 
              className="w-full h-full"
              onError={(e) => {
                e.target.src = '/profile.svg' // Fallback image
                e.target.style.width = '100px'
                e.target.style.height = '100px'
              }}
            />
          </div>
          
          <h1 className="text-2xl font-semibold text-gray-800 mb-3 text-center">Access Your Portfolio</h1>
          <p className="text-gray-600 mb-8 text-center max-w-xs">Connect your wallet to view and manage your investments and financial assets.</p>
          
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
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 flex justify-around items-center h-14 bg-white shadow-lg max-w-[480px] mx-auto border-t border-gray-100">
          <button className="w-1/3 flex items-center justify-center">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-['Inter']">
      <Head>
        <title>Portfolio - World Super App</title>
        <meta name="description" content="View and manage your investments" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="max-w-[480px] mx-auto px-5 py-4 pb-20 relative min-h-screen overflow-auto">
        {/* Header */}
        <header className="flex justify-between items-center py-3 sticky top-0 bg-gray-50 z-10">
          <h1 className="text-lg font-semibold text-gray-800">Financial Portfolio</h1>
          <button 
            onClick={() => router.push('/profile')}
            className="bg-white rounded-full p-2 shadow-sm"
          >
            <Image src="/profile.svg" alt="Profile" width={28} height={28} />
          </button>
        </header>

        {/* Portfolio Summary */}
        <div className="mt-4 p-5 bg-white rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-gray-800 font-medium">Total Assets</h3>
            <span className="text-2xl font-bold">${balance}</span>
          </div>
          
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="bg-indigo-50 p-3 rounded-xl">
              <span className="text-sm text-gray-600">Investments</span>
              <p className="text-lg font-medium text-gray-800">$1,450.00</p>
            </div>
            <div className="bg-green-50 p-3 rounded-xl">
              <span className="text-sm text-gray-600">Earnings</span>
              <p className="text-lg font-medium text-green-600">+$350.00</p>
            </div>
          </div>
        </div>

        {/* Portfolio Tabs */}
        <div className="mt-6">
          <div className="flex border-b border-gray-200">
            <button 
              onClick={() => setActiveTab('investments')}
              className={`flex-1 py-2 text-center text-sm font-medium ${activeTab === 'investments' ? 'text-indigo-600 border-b-2 border-indigo-500' : 'text-gray-500'}`}
            >
              Investments
            </button>
            <button 
              onClick={() => setActiveTab('activity')}
              className={`flex-1 py-2 text-center text-sm font-medium ${activeTab === 'activity' ? 'text-indigo-600 border-b-2 border-indigo-500' : 'text-gray-500'}`}
            >
              Activity
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`flex-1 py-2 text-center text-sm font-medium ${activeTab === 'analytics' ? 'text-indigo-600 border-b-2 border-indigo-500' : 'text-gray-500'}`}
            >
              Analytics
            </button>
          </div>

          {/* Investments tab content */}
          {activeTab === 'investments' && (
            <div className="mt-4 space-y-4">
              {/* Crypto Investments */}
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="bg-orange-100 p-2 rounded-full mr-3">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M15 9.354C14.3519 8.70589 13.4632 8.3274 12.5 8.3274C10.5669 8.3274 9 9.8943 9 11.8274C9 13.7606 10.5669 15.3274 12.5 15.3274C13.4632 15.3274 14.3519 14.9489 15 14.3009" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium">Bitcoin</h4>
                      <p className="text-xs text-gray-500">BTC</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">$800.00</p>
                    <p className="text-xs text-green-500">+5.2%</p>
                  </div>
                </div>
                <div className="h-10 bg-orange-50 rounded-lg overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-200 to-orange-300 w-3/4"></div>
                </div>
              </div>

              {/* Stock Investment */}
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="bg-blue-100 p-2 rounded-full mr-3">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M16 12H12V8" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium">Tech Fund</h4>
                      <p className="text-xs text-gray-500">ETF</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">$450.00</p>
                    <p className="text-xs text-green-500">+3.8%</p>
                  </div>
                </div>
                <div className="h-10 bg-blue-50 rounded-lg overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-200 to-blue-300 w-1/2"></div>
                </div>
              </div>

              {/* Bond Investment */}
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="bg-green-100 p-2 rounded-full mr-3">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M8 12H16" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 16V8" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium">Stable Bond</h4>
                      <p className="text-xs text-gray-500">BOND</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">$200.00</p>
                    <p className="text-xs text-green-500">+1.2%</p>
                  </div>
                </div>
                <div className="h-10 bg-green-50 rounded-lg overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-200 to-green-300 w-1/4"></div>
                </div>
              </div>
            </div>
          )}
          
          {/* Activity tab content */}
          {activeTab === 'activity' && (
            <div className="mt-4 space-y-3">
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-green-100 p-2 rounded-full mr-3">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 20V4" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M5 11L12 4L19 11" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium">Purchased BTC</h4>
                      <p className="text-xs text-gray-500">May 12, 2023</p>
                    </div>
                  </div>
                  <p className="font-medium text-green-500">+$200.00</p>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-blue-100 p-2 rounded-full mr-3">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 20V4" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M5 11L12 4L19 11" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium">Purchased ETF</h4>
                      <p className="text-xs text-gray-500">May 5, 2023</p>
                    </div>
                  </div>
                  <p className="font-medium text-blue-500">+$450.00</p>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-red-100 p-2 rounded-full mr-3">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 4V20" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M5 13L12 20L19 13" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium">Sold ETH</h4>
                      <p className="text-xs text-gray-500">April 28, 2023</p>
                    </div>
                  </div>
                  <p className="font-medium text-red-500">-$150.00</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Analytics tab content */}
          {activeTab === 'analytics' && (
            <div className="mt-4 space-y-4">
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <h4 className="font-medium mb-3">Portfolio Allocation</h4>
                <div className="h-10 bg-gray-100 rounded-lg overflow-hidden flex">
                  <div className="h-full bg-blue-500 w-[55%]"></div>
                  <div className="h-full bg-orange-500 w-[30%]"></div>
                  <div className="h-full bg-green-500 w-[15%]"></div>
                </div>
                <div className="mt-3 flex text-xs">
                  <div className="flex items-center mr-4">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
                    <span>Stocks (55%)</span>
                  </div>
                  <div className="flex items-center mr-4">
                    <div className="w-3 h-3 rounded-full bg-orange-500 mr-1"></div>
                    <span>Crypto (30%)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                    <span>Bonds (15%)</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <h4 className="font-medium mb-3">Monthly Performance</h4>
                <div className="h-32 flex items-end space-x-2">
                  <div className="flex-1 bg-indigo-100 rounded-t-md" style={{ height: '40%' }}></div>
                  <div className="flex-1 bg-indigo-200 rounded-t-md" style={{ height: '60%' }}></div>
                  <div className="flex-1 bg-indigo-300 rounded-t-md" style={{ height: '30%' }}></div>
                  <div className="flex-1 bg-indigo-400 rounded-t-md" style={{ height: '70%' }}></div>
                  <div className="flex-1 bg-indigo-500 rounded-t-md" style={{ height: '90%' }}></div>
                  <div className="flex-1 bg-indigo-600 rounded-t-md" style={{ height: '80%' }}></div>
                </div>
                <div className="mt-2 flex justify-between text-xs text-gray-500">
                  <span>Jan</span>
                  <span>Feb</span>
                  <span>Mar</span>
                  <span>Apr</span>
                  <span>May</span>
                  <span>Jun</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation - Simplified */}
      <nav className="fixed bottom-0 left-0 right-0 flex justify-around items-center h-14 bg-white shadow-md max-w-[480px] mx-auto border-t border-gray-100">
        <button className="w-1/3 flex items-center justify-center">
          <Image src="/portfolio.svg" alt="Portfolio" width={24} height={24} className="text-indigo-500" />
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
    </div>
  );
} 