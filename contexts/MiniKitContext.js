import { createContext, useContext, useState, useEffect } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';

// Create context
const MiniKitContext = createContext({
  isInstalled: false,
  username: 'User',
  profilePicture: '/profile.svg',
  isLoading: true
});

export function MiniKitProvider({ children }) {
  const [state, setState] = useState({
    isInstalled: false,
    username: 'User',
    profilePicture: '/profile.svg',
    isLoading: true
  });

  useEffect(() => {
    // Initialize MiniKit
    if (typeof window !== 'undefined') {
      console.log('Initializing MiniKit in MiniKitProvider...');
      try {
        // Install MiniKit
        MiniKit.install('app_b82ac860b09f1c2e8e5c37ca1452bae3');
        console.log('MiniKit installation attempted');
        
        // Check if MiniKit is installed
        const checkMiniKitStatus = () => {
          try {
            const installed = MiniKit.isInstalled();
            console.log('MiniKit installed status:', installed);
            
            if (installed) {
              console.log('MiniKit is running inside World App');
              
              // Set installed state immediately to prevent flashing
              setState(prev => ({ ...prev, isInstalled: true, isLoading: false }));
              
              // Get user info
              const getUserInfo = async () => {
                try {
                  // Try to get username from MiniKit.user
                  if (MiniKit.user && MiniKit.user.username) {
                    console.log('Found username in MiniKit.user:', MiniKit.user.username);
                    setState(prev => ({
                      ...prev,
                      username: MiniKit.user.username,
                      profilePicture: MiniKit.user.profilePictureUrl || '/profile.svg'
                    }));
                  } 
                  // If not available, try to get it from wallet address
                  else if (MiniKit.walletAddress) {
                    console.log('Found wallet address, fetching user by address:', MiniKit.walletAddress);
                    try {
                      const worldIdUser = await MiniKit.getUserByAddress(MiniKit.walletAddress);
                      if (worldIdUser && worldIdUser.username) {
                        console.log('Retrieved username:', worldIdUser.username);
                        setState(prev => ({
                          ...prev,
                          username: worldIdUser.username,
                          profilePicture: worldIdUser.profilePictureUrl || '/profile.svg'
                        }));
                      }
                    } catch (error) {
                      console.error('Error fetching user by address:', error);
                    }
                  }
                } catch (error) {
                  console.error('Error getting user info:', error);
                }
              };
              
              getUserInfo();
            } else {
              console.log('MiniKit is NOT running inside World App');
              setState(prev => ({ ...prev, isInstalled: false, isLoading: false }));
            }
          } catch (error) {
            console.error('Error checking MiniKit status:', error);
            setState(prev => ({ ...prev, isInstalled: false, isLoading: false }));
          }
        };
        
        // Initial check with delay to ensure MiniKit is initialized
        setTimeout(checkMiniKitStatus, 1000);
      } catch (error) {
        console.error('Error in MiniKit installation:', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    }
  }, []);

  return (
    <MiniKitContext.Provider value={state}>
      {children}
    </MiniKitContext.Provider>
  );
}

// Custom hook to use the MiniKit context
export function useMiniKitContext() {
  return useContext(MiniKitContext);
} 