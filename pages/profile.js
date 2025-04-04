import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { MiniKit } from '@worldcoin/minikit-js';

export default function Profile() {
  const router = useRouter();
  const [username, setUsername] = useState('User');
  const [isInstalled, setIsInstalled] = useState(false);
  const [profilePicture, setProfilePicture] = useState('/profile.svg');

  useEffect(() => {
    // Check if MiniKit is installed
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const installed = MiniKit.isInstalled();
        setIsInstalled(installed);
        
        if (installed) {
          console.log('MiniKit is running inside World App - Profile page');
          
          try {
            // Get the user information from MiniKit
            if (MiniKit.user && MiniKit.user.username) {
              console.log('Found username in MiniKit.user:', MiniKit.user.username);
              setUsername(MiniKit.user.username);
              
              // Check if profile picture URL is available
              if (MiniKit.user.profilePictureUrl) {
                setProfilePicture(MiniKit.user.profilePictureUrl);
              }
            } else {
              console.log('No username found in MiniKit.user, will try to fetch it');
              
              // Alternative way to get user info if it's not immediately available
              const fetchUserInfo = async () => {
                try {
                  // First check if we can get the user's address
                  if (MiniKit.walletAddress) {
                    console.log('Found wallet address, fetching user by address');
                    const worldIdUser = await MiniKit.getUserByAddress(MiniKit.walletAddress);
                    
                    if (worldIdUser && worldIdUser.username) {
                      console.log('Retrieved username:', worldIdUser.username);
                      setUsername(worldIdUser.username);
                      
                      if (worldIdUser.profilePictureUrl) {
                        setProfilePicture(worldIdUser.profilePictureUrl);
                      }
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
        <title>Your Profile - Lend & Borrow</title>
        <meta name="description" content="User profile page" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="max-w-[480px] mx-auto px-5 py-4 relative min-h-screen">
        {/* Header */}
        <header className="flex justify-between items-center py-4">
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
                  layout="fill" 
                  objectFit="cover"
                />
              </div>
            </div>
          </div>
          
          <h2 className="mt-6 text-2xl font-semibold text-gray-800">{username}</h2>
          <p className="mt-2 text-gray-500">World App User</p>
          
          <div className="mt-12 w-full p-6 bg-white rounded-2xl shadow-sm">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Account Details</h3>
            
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600">Username</span>
              <span className="font-medium">{username}</span>
            </div>
            
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-gray-600">Verification</span>
              <span className="text-green-500 font-medium">Verified</span>
            </div>
            
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-600">Member Since</span>
              <span className="font-medium">April 2023</span>
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 flex justify-around p-4 bg-white shadow-sm max-w-[480px] mx-auto">
          <button 
            onClick={() => router.push('/')}
            className="p-2 text-gray-500 hover:text-indigo-500 transition-colors"
          >
            <Image src="/home.svg" alt="Home" width={24} height={24} />
          </button>
          <button 
            onClick={() => router.push('/portfolio')}
            className="p-2 text-gray-500 hover:text-indigo-500 transition-colors"
          >
            <Image src="/portfolio.svg" alt="Portfolio" width={24} height={24} />
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