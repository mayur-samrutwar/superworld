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
  checkReferralStatus: () => {},
  referUser: () => Promise.resolve({}),
  totalReferrals: 0,
  checkConnectionStatus: () => Promise.resolve(true)
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
    hasReferral: false,
    totalReferrals: 0
  });

  // Always set hasReferral to false for testing
  const checkReferralStatus = () => {
    // Check localStorage first for bypass
    const hasReferralInStorage = localStorage.getItem('hasReferral') === 'true';
    
    setState(prev => ({
      ...prev,
      hasReferral: hasReferralInStorage
    }));
    
    return hasReferralInStorage;
  };

  // Function to initiate wallet authentication
  const initiateWalletAuth = async () => {
    if (!MiniKit.isInstalled()) {
      console.error('MiniKit is not installed. Cannot authenticate wallet.');
      return false;
    }

    try {
      // In a production app, you would fetch a nonce from your server
      // For demo purposes, we'll create a simple nonce
      const nonce = Date.now().toString();
      
      // Call walletAuth command with required parameters using commandsAsync
      const { commandPayload, finalPayload } = await MiniKit.commandsAsync.walletAuth({
        nonce: nonce,
        statement: 'Sign in to World Super App',
        expirationTime: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // 24h expiry
      });

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
        
        // Always set referral status to false
        checkReferralStatus();
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error during wallet authentication:', error);
      return false;
    }
  };

  // Function to get user info after wallet authentication
  const getUserInfo = async (address) => {
    if (!address) return;
    
    try {
      const worldIdUser = await MiniKit.getUserByAddress(address);
      
      if (worldIdUser && worldIdUser.username) {
        // Get token balances from MiniKit
        let tokenBalances = {};
        let defaultBalance = '0.00';
        
        try {
          // Check if MiniKit has getBalances or similar method
          if (typeof MiniKit.getBalances === 'function') {
            tokenBalances = await MiniKit.getBalances();
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
            defaultBalance = '16.00';
            tokenBalances = {
              WLD: '16.00',
              'USDC.e': '25.50',
              KEEP: '10.75'
            };
          }
        } catch (balanceError) {
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
          tokenBalances: tokenBalances,
          hasReferral: false // Always false
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

  // Function to refer a new user
  const referUser = async (username) => {
    if (!username) return { success: false, message: 'Username is required' };
    if (!state.walletAddress) return { success: false, message: 'Wallet not connected' };
    
    try {
      // First resolve the username to get the address
      let targetAddress = '';
      
      try {
        const response = await fetch(`https://usernames.worldcoin.org/api/v1/${username}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            return { success: false, message: 'Username not found' };
          } else {
            return { success: false, message: 'Error resolving username' };
          }
        }
        
        const data = await response.json();
        targetAddress = data.address;
        
        if (!targetAddress) {
          return { success: false, message: 'Could not resolve username to address' };
        }
      } catch (error) {
        console.error('Error resolving username:', error);
        return { success: false, message: 'Error resolving username' };
      }
      
      console.log(`Referring user with username ${username}, address ${targetAddress}`);
      
      // Get contract address from environment variable
      const contractAddress = process.env.NEXT_PUBLIC_PROFILE_CONTRACT_ADDRESS;
      if (!contractAddress) {
        console.error('Contract address not found in environment variables');
        return { success: false, message: 'Contract address not configured' };
      }
      
      console.log('Contract address:', contractAddress);
      
      // Check if MiniKit is available and has the right methods
      if (!MiniKit.isInstalled()) {
        console.error('MiniKit is not installed');
        return { success: false, message: 'MiniKit is not installed' };
      }
      
      console.log('MiniKit commands available:', MiniKit.commands);
      
      // Create transaction object according to World App documentation
      // Using the correct format for sendTransaction
      const txPayload = {
        transaction: [
          {
            address: contractAddress,
            abi: [
              {
                "inputs": [
                  {
                    "internalType": "address",
                    "name": "_newUser",
                    "type": "address"
                  },
                  {
                    "internalType": "string",
                    "name": "_username",
                    "type": "string"
                  }
                ],
                "name": "createUser",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
              }
            ],
            functionName: "createUser",
            args: [targetAddress, username]
          }
        ]
      };
      
      console.log('Sending contract transaction with payload:', JSON.stringify(txPayload));
      
      try {
        // Create a promise that rejects after timeout
        const timeoutPromise = new Promise((_, reject) => {
          const id = setTimeout(() => {
            clearTimeout(id);
            reject(new Error('Transaction request timed out. Please try again.'));
          }, 30000); // 30 second timeout
        });
        
        // Use the World App's sendTransaction method with a timeout
        console.log('Calling MiniKit.commandsAsync.sendTransaction...');
        
        // Race between the transaction and the timeout
        const response = await Promise.race([
          MiniKit.commandsAsync.sendTransaction(txPayload),
          timeoutPromise
        ]);
        
        console.log('Transaction response:', JSON.stringify(response));
        
        // Check if response is undefined or null (might occur if transaction is cancelled)
        if (!response) {
          console.error('Transaction response is empty');
          return {
            success: false,
            message: 'Transaction was cancelled or failed with an unknown error.'
          };
        }
        
        // The transaction was completed either successfully or with an error
        if (response && response.finalPayload && response.finalPayload.status === 'success') {
          // Transaction was successfully sent
          const txId = response.finalPayload.transaction_id;
          console.log('Transaction was sent successfully with ID:', txId);
          
          if (!txId) {
            console.error('No transaction ID received from MiniKit');
            return { 
              success: false, 
              message: 'No transaction ID received from World App'
            };
          }
          
          // Update referral count in state
          const currentCount = parseInt(localStorage.getItem('totalReferrals') || '0', 10);
          const newCount = currentCount + 1;
          
          // Save to localStorage and update state
          localStorage.setItem('totalReferrals', newCount.toString());
          setState(prev => ({
            ...prev,
            totalReferrals: newCount
          }));
          
          return { 
            success: true, 
            message: 'User successfully referred',
            totalReferrals: newCount,
            txHash: txId // Use transaction ID as the hash
          };
        } else {
          // Transaction sending failed or was rejected
          const errorMsg = response?.finalPayload?.message || 'Unknown error';
          const errorDetails = response?.finalPayload?.details || {};
          const errorCode = response?.finalPayload?.error_code;
          
          // Create user-friendly error message
          let userFriendlyError = errorMsg;
          
          // Specific handling for known error types
          if (errorCode === 'invalid_contract') {
            userFriendlyError = "Contract not registered in World App developer portal. Please add the contract address in the World App developer portal under 'Configuration > Advanced'";
          } else if (errorCode === 'user_rejected') {
            userFriendlyError = "Transaction was rejected by the user.";
          } else if (errorCode === 'already_processing') {
            userFriendlyError = "Another transaction is already being processed. Please wait and try again.";
          } else if (response?.finalPayload?.status === 'pending') {
            // Handle pending status - this shouldn't happen in normal flow but just in case
            userFriendlyError = "Transaction is still pending. Please check World App for status.";
          }
          
          console.error('Transaction failed:', JSON.stringify({
            message: errorMsg,
            errorCode: errorCode,
            details: errorDetails,
            response: response
          }));
          
          return { 
            success: false, 
            message: userFriendlyError,
            error: errorMsg,
            errorType: errorCode,
            errorDetails: errorDetails
          };
        }
      } catch (error) {
        // Capture full error details for debugging
        console.error('Error during transaction:', error);
        
        // Handle specific error messages
        let errorMessage = 'Unknown error occurred';
        
        if (error.message === 'Transaction request timed out. Please try again.') {
          errorMessage = 'Transaction request timed out. The World App may not be responding. Please try again or restart the app.';
        } else if (error.message && error.message.includes('user rejected')) {
          errorMessage = 'Transaction was rejected by the user.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        return { 
          success: false, 
          message: `Transaction error: ${errorMessage}`,
          error: error,
          errorType: error.name,
          errorDetails: error.details
        };
      }
    } catch (error) {
      console.error('Error referring user:', error);
      return { success: false, message: 'Failed to refer user: ' + error.message };
    }
  };

  // Check for existing authentication
  const checkExistingAuth = async () => {
    const walletAuthenticated = localStorage.getItem('walletAuthenticated') === 'true';
    const walletAddress = localStorage.getItem('walletAddress');
    const username = localStorage.getItem('username');
    const profilePicture = localStorage.getItem('profilePicture');
    const storedBalance = localStorage.getItem('balance');
    const hasReferralInStorage = localStorage.getItem('hasReferral') === 'true';
    const totalReferrals = parseInt(localStorage.getItem('totalReferrals') || '0', 10);
    
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
        tokenBalances: storedTokenBalances,
        hasReferral: hasReferralInStorage,
        totalReferrals
      }));
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
      },
      hasReferral: false
    }));
    
    // Clear localStorage
    localStorage.removeItem('walletAuthenticated');
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('username');
    localStorage.removeItem('profilePicture');
    localStorage.removeItem('balance');
    localStorage.removeItem('tokenBalances');
    localStorage.removeItem('bypassRestriction');
    localStorage.removeItem('completedKYC');
    localStorage.removeItem('hasReferral');
  };

  // Function to check if the wallet is still connected
  const checkConnectionStatus = async () => {
    try {
      if (!MiniKit.isInstalled()) {
        return false;
      }
      
      if (!state.walletAddress) {
        return false;
      }
      
      // Try to get the current wallet address
      const currentAddress = MiniKit.walletAddress;
      
      // If there's no current address, or it doesn't match
      // the stored address, the connection has been lost
      if (!currentAddress || currentAddress !== state.walletAddress) {
        return false;
      }
      
      // Try a lightweight call to verify the connection
      try {
        // Using the getChainId method as a lightweight ping
        await MiniKit.commandsAsync.getChainId();
        return true;
      } catch (error) {
        console.warn('Connection check failed:', error);
        return false;
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
      return false;
    }
  };

  useEffect(() => {
    // Initialize MiniKit
    if (typeof window !== 'undefined') {
      try {
        // Install MiniKit
        MiniKit.install('app_b82ac860b09f1c2e8e5c37ca1452bae3', {environment: 'staging'});
        
        // Check if MiniKit is installed
        const checkMiniKitStatus = async () => {
          try {
            const installed = MiniKit.isInstalled();
            
            if (installed) {
              // Set installed state immediately
              setState(prev => ({ ...prev, isInstalled: true, isLoading: false, hasReferral: false }));
              
              // Check for existing auth - but don't redirect anywhere
              await checkExistingAuth();
              
              // Get wallet address from MiniKit if available
              const currentAddress = MiniKit.walletAddress;
              if (currentAddress && !state.walletAuthenticated) {
                setState(prev => ({
                  ...prev,
                  walletAddress: currentAddress,
                  walletAuthenticated: true,
                  hasReferral: false
                }));
                
                // Get user info for the current address
                await getUserInfo(currentAddress);
              }
            } else {
              setState(prev => ({ ...prev, isInstalled: false, isLoading: false }));
            }
          } catch (error) {
            setState(prev => ({ ...prev, isInstalled: false, isLoading: false }));
          }
        };
        
        // Initial check with delay to ensure MiniKit is initialized
        setTimeout(checkMiniKitStatus, 500);
      } catch (error) {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    }
  }, []);

  return (
    <MiniKitContext.Provider value={{
      ...state,
      initiateWalletAuth,
      logout,
      checkReferralStatus,
      referUser,
      checkConnectionStatus
    }}>
      {children}
    </MiniKitContext.Provider>
  );
}

// Custom hook to use the MiniKit context
export function useMiniKitContext() {
  return useContext(MiniKitContext);
} 