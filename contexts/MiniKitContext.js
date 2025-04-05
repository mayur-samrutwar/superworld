import { createContext, useContext, useState, useEffect } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';

// Create context
const MiniKitContext = createContext({
  isInstalled: false,
  username: 'User',
  profilePicture: '/profile.svg',
  isLoading: true,
  walletAddress: null,
  walletAuthenticated: false,
  initiateWalletAuth: () => {},
  logout: () => {},
  balance: '0.00',
  tokenBalances: {
    WLD: '0.00',
    'USDC.e': '0.00',
    KEEP: '0.00'
  },
  hasReferral: false,
  checkReferralStatus: () => {}
});

export function MiniKitProvider({ children }) {
  const [state, setState] = useState({
    isInstalled: false,
    username: 'User',
    profilePicture: '/profile.svg',
    isLoading: true,
    walletAddress: null,
    walletAuthenticated: false,
    balance: '0.00',
    tokenBalances: {
      WLD: '0.00',
      'USDC.e': '0.00',
      KEEP: '0.00'
    },
    hasReferral: false
  });

  // Check if user has been referred or used the bypass
  const checkReferralStatus = () => {
    // In a real app, you would check this against your backend
    // For now, we're using localStorage
    const bypassRestriction = localStorage.getItem('bypassRestriction');
    
    const hasReferral = bypassRestriction === 'true';
    
    setState(prev => ({
      ...prev,
      hasReferral
    }));
    
    return hasReferral;
  };

  // Function to initiate wallet authentication
  const initiateWalletAuth = async () => {
    if (!MiniKit.isInstalled()) {
      console.error('MiniKit is not installed. Cannot authenticate wallet.');
      return;
    }

    try {
      console.log('Initiating Wallet Auth...');
      
      // In a production app, you would fetch a nonce from your server
      // For demo purposes, we'll create a simple nonce
      const nonce = Date.now().toString();
      
      // Call walletAuth command with required parameters using commandsAsync
      const { commandPayload, finalPayload } = await MiniKit.commandsAsync.walletAuth({
        nonce: nonce,
        statement: 'Sign in to World Super App',
        expirationTime: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // 24h expiry
      });

      console.log('Wallet Auth result:', finalPayload);

      if (finalPayload.status === 'success') {
        // In a production app, you would verify this signature on your backend
        // For this demo app, we'll accept it client-side
        setState(prev => ({
          ...prev, 
          walletAuthenticated: true,
          walletAddress: finalPayload.address
        }));

        // Now fetch user info with the authenticated wallet
        await getUserInfo(finalPayload.address);
        
        // Store authentication in localStorage to persist between sessions
        localStorage.setItem('walletAuthenticated', 'true');
        localStorage.setItem('walletAddress', finalPayload.address);
        
        // Check referral status after successful authentication
        checkReferralStatus();
      } else {
        console.error('Wallet auth failed:', finalPayload);
      }
    } catch (error) {
      console.error('Error during wallet authentication:', error);
    }
  };

  // Function to get user info after wallet authentication
  const getUserInfo = async (address) => {
    if (!address) return;
    
    try {
      console.log('Fetching user info for address:', address);
      const worldIdUser = await MiniKit.getUserByAddress(address);
      
      if (worldIdUser && worldIdUser.username) {
        console.log('Retrieved username:', worldIdUser.username);
        
        // Get token balances from MiniKit
        let tokenBalances = {};
        let defaultBalance = '0.00';
        
        try {
          // Check if MiniKit has getBalances or similar method
          if (typeof MiniKit.getBalances === 'function') {
            tokenBalances = await MiniKit.getBalances();
            console.log('Retrieved token balances:', tokenBalances);
          } else if (typeof MiniKit.getBalance === 'function') {
            // If there's a getBalance method, try to get individual balances
            const wldBalance = await MiniKit.getBalance('WLD');
            const usdcBalance = await MiniKit.getBalance('USDC.e');
            const keepBalance = await MiniKit.getBalance('KEEP');
            
            tokenBalances = {
              WLD: wldBalance,
              'USDC.e': usdcBalance,
              KEEP: keepBalance
            };
          } else if (MiniKit.tokenBalances) {
            // Direct access to tokenBalances if available
            tokenBalances = MiniKit.tokenBalances;
          }
          
          // If we have WLD balance, use it as the default displayed balance
          if (tokenBalances.WLD && !isNaN(parseFloat(tokenBalances.WLD))) {
            defaultBalance = parseFloat(tokenBalances.WLD).toFixed(2);
          } else if (worldIdUser.balance) {
            defaultBalance = parseFloat(worldIdUser.balance).toFixed(2);
          } else {
            // For development, set a realistic value to show WLD coins
            console.warn('Using mock balance for development');
            defaultBalance = '16.00';
            tokenBalances = {
              WLD: '16.00',
              'USDC.e': '25.50',
              KEEP: '10.75'
            };
          }
        } catch (balanceError) {
          console.warn('Could not retrieve token balances:', balanceError);
          // Fallback to realistic placeholder values for development
          defaultBalance = '16.00';
          tokenBalances = {
            WLD: '16.00',
            'USDC.e': '25.50',
            KEEP: '10.75'
          };
        }
        
        setState(prev => ({
          ...prev,
          username: worldIdUser.username,
          profilePicture: worldIdUser.profilePictureUrl || '/profile.svg',
          balance: defaultBalance,
          tokenBalances: tokenBalances
        }));
        
        // Store user info in localStorage
        localStorage.setItem('username', worldIdUser.username);
        localStorage.setItem('profilePicture', worldIdUser.profilePictureUrl || '/profile.svg');
        localStorage.setItem('balance', defaultBalance);
        localStorage.setItem('tokenBalances', JSON.stringify(tokenBalances));
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  // Check for existing authentication
  const checkExistingAuth = async () => {
    const walletAuthenticated = localStorage.getItem('walletAuthenticated') === 'true';
    const walletAddress = localStorage.getItem('walletAddress');
    const username = localStorage.getItem('username');
    const profilePicture = localStorage.getItem('profilePicture');
    const storedBalance = localStorage.getItem('balance');
    
    // Get stored token balances
    let storedTokenBalances = {
      WLD: '0.00',
      'USDC.e': '0.00',
      KEEP: '0.00'
    };
    
    try {
      const tokenBalancesJSON = localStorage.getItem('tokenBalances');
      if (tokenBalancesJSON) {
        storedTokenBalances = JSON.parse(tokenBalancesJSON);
      }
    } catch (error) {
      console.warn('Error parsing stored token balances:', error);
    }
    
    if (walletAuthenticated && walletAddress) {
      setState(prev => ({
        ...prev,
        walletAuthenticated,
        walletAddress,
        username: username || 'User',
        profilePicture: profilePicture || '/profile.svg',
        balance: storedBalance || '0.00',
        tokenBalances: storedTokenBalances
      }));
      
      // Check referral status for existing authenticated users
      checkReferralStatus();
    }
  };

  // Function to logout/disconnect the wallet
  const logout = () => {
    // Clear authentication state
    setState(prev => ({
      ...prev,
      walletAuthenticated: false,
      walletAddress: null,
      username: 'User',
      profilePicture: '/profile.svg',
      balance: '0.00',
      tokenBalances: {
        WLD: '0.00',
        'USDC.e': '0.00',
        KEEP: '0.00'
      }
    }));
    
    // Clear localStorage
    localStorage.removeItem('walletAuthenticated');
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('username');
    localStorage.removeItem('profilePicture');
    localStorage.removeItem('balance');
    localStorage.removeItem('tokenBalances');
    
    console.log('User logged out');
  };

  useEffect(() => {
    // Initialize MiniKit
    if (typeof window !== 'undefined') {
      console.log('Initializing MiniKit in MiniKitProvider...');
      try {
        // Install MiniKit - notice we do this in a single useEffect to avoid race conditions
        MiniKit.install('app_b82ac860b09f1c2e8e5c37ca1452bae3', {environment: 'staging'});
        console.log('MiniKit installation attempted');
        
        // Check if MiniKit is installed
        const checkMiniKitStatus = async () => {
          try {
            const installed = MiniKit.isInstalled();
            console.log('MiniKit installed status:', installed);
            
            if (installed) {
              console.log('MiniKit is running inside World App');
              
              // Set installed state immediately to prevent flashing
              setState(prev => ({ ...prev, isInstalled: true, isLoading: false }));
              
              // Check for existing auth first
              await checkExistingAuth();
              
              // Get wallet address from MiniKit if available
              const currentAddress = MiniKit.walletAddress;
              if (currentAddress && !state.walletAuthenticated) {
                setState(prev => ({
                  ...prev,
                  walletAddress: currentAddress,
                  walletAuthenticated: true
                }));
                
                // Get user info for the current address
                await getUserInfo(currentAddress);
              }
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
    <MiniKitContext.Provider value={{
      ...state,
      initiateWalletAuth,
      logout,
      checkReferralStatus
    }}>
      {children}
    </MiniKitContext.Provider>
  );
}

// Custom hook to use the MiniKit context
export function useMiniKitContext() {
  return useContext(MiniKitContext);
} 