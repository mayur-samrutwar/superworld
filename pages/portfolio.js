import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { MiniKit } from '@worldcoin/minikit-js';

export default function Portfolio() {
  const router = useRouter();
  const [isInstalled, setIsInstalled] = useState(false);
  const [username, setUsername] = useState('User');

  useEffect(() => {
    // Check if MiniKit is installed
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const installed = MiniKit.isInstalled();
        setIsInstalled(installed);
        
        if (installed) {
          // Get the username from MiniKit
          try {
            if (MiniKit.user && MiniKit.user.username) {
              setUsername(MiniKit.user.username);
            } else {
              // Alternative way to get user info if it's not immediately available
              const fetchUserInfo = async () => {
                try {
                  if (MiniKit.walletAddress) {
                    const worldIdUser = await MiniKit.getUserByAddress(MiniKit.walletAddress);
                    
                    if (worldIdUser && worldIdUser.username) {
                      setUsername(worldIdUser.username);
                    }
                  }
                } catch (error) {
                  console.error('Error fetching user info:', error);
                }
              };
              
              fetchUserInfo();
            }
          } catch (error) {
            console.error('Error accessing MiniKit user data:', error);
          }
        }
      }, 1000);
    }
  }, []);

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
        <title>Portfolio - Lend & Borrow</title>
        <meta name="description" content="User portfolio page" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="max-w-[480px] mx-auto px-5 py-4 relative min-h-screen">
        {/* Header */}
        <header className="flex justify-between items-center py-4">
          <h1 className="text-lg font-semibold text-gray-800">Portfolio</h1>
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

        {/* Portfolio Content */}
        <div className="mt-8 flex flex-col items-center">
          <div className="w-full p-6 bg-white rounded-2xl shadow-sm">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Your Portfolio</h3>
            <p className="text-gray-600">Portfolio content will appear here.</p>
          </div>
        </div>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 flex justify-around p-4 bg-white shadow-sm max-w-[480px] mx-auto">
          <button 
            className="p-2 text-indigo-500"
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