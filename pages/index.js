import { useState } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useMiniKitContext } from '../contexts/MiniKitContext';

export default function Home() {
  const router = useRouter();
  const { isInstalled, username, isLoading, walletAuthenticated, initiateWalletAuth } = useMiniKitContext();
  const [balance] = useState('2,450.00');

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
        <title>Lend & Borrow</title>
        <meta name="description" content="Lending and borrowing platform" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="max-w-[480px] mx-auto px-5 py-4 relative min-h-screen">
        {/* Header */}
        <header className="flex justify-between items-center py-4">
          <div className="bg-white rounded-full p-2 shadow-sm">
            <Image src="/notification.svg" alt="Notifications" width={24} height={24} />
          </div>
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

        {/* Wallet Notice */}
        {!walletAuthenticated && (
          <div className="mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200 flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-yellow-800">Please connect your wallet to enable transactions</p>
            </div>
            <button 
              onClick={initiateWalletAuth}
              className="bg-yellow-500 text-white text-xs py-1 px-3 rounded-lg hover:bg-yellow-600"
            >
              Connect
            </button>
          </div>
        )}

        {/* Balance Card */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-500 rounded-3xl p-6 my-6 text-white shadow-lg">
          <div className="relative">
            <h2 className="text-sm opacity-90 mb-2">Total Balance</h2>
            <h1 className="text-3xl font-semibold">${balance}</h1>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-8 bg-white/20 rounded-lg"></div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 my-6">
          <button 
            className={`flex-1 flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all ${!walletAuthenticated ? 'opacity-60 cursor-not-allowed' : ''}`}
            disabled={!walletAuthenticated}
            onClick={() => walletAuthenticated ? router.push('/lend') : initiateWalletAuth()}
          >
            <Image src="/lend.svg" alt="Lend" width={24} height={24} />
            <span className="text-gray-600 font-medium">Lend</span>
          </button>
          <button 
            className={`flex-1 flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all ${!walletAuthenticated ? 'opacity-60 cursor-not-allowed' : ''}`}
            disabled={!walletAuthenticated}
            onClick={() => walletAuthenticated ? router.push('/borrow') : initiateWalletAuth()}
          >
            <Image src="/borrow.svg" alt="Borrow" width={24} height={24} />
            <span className="text-gray-600 font-medium">Borrow</span>
          </button>
        </div>

        {/* Recent Transactions */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Transactions</h3>
          <div className="flex flex-col gap-3">
            {/* Dummy transaction cards */}
            <div className="flex items-center p-4 bg-white rounded-2xl shadow-sm">
              <div className="bg-gray-100 p-2 rounded-xl mr-4">
                <Image src="/transaction.svg" alt="Transaction" width={24} height={24} />
              </div>
              <div className="flex-1">
                <h4 className="text-gray-800">Lent to User123</h4>
                <p className="text-sm text-gray-500">2 hours ago</p>
              </div>
              <div className="font-semibold text-green-500">+$500.00</div>
            </div>
            <div className="flex items-center p-4 bg-white rounded-2xl shadow-sm">
              <div className="bg-gray-100 p-2 rounded-xl mr-4">
                <Image src="/transaction.svg" alt="Transaction" width={24} height={24} />
              </div>
              <div className="flex-1">
                <h4 className="text-gray-800">Borrowed from User456</h4>
                <p className="text-sm text-gray-500">1 day ago</p>
              </div>
              <div className="font-semibold text-red-500">-$200.00</div>
            </div>
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
            className="p-2 text-indigo-500"
          >
            <Image src="/home.svg" alt="Home" width={24} height={24} />
          </button>
          <button 
            onClick={() => router.push('/wallet')}
            className="p-2 text-gray-500 hover:text-indigo-500 transition-colors"
          >
            <Image src="/wallet.svg" alt="Wallet" width={24} height={24} />
          </button>
        </nav>
      </main>
    </div>
  );
}
