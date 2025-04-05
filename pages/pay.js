import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useMiniKitContext } from '../contexts/MiniKitContext';
import { MiniKit, tokenToDecimals, Tokens, ResponseEvent } from '@worldcoin/minikit-js';

export default function Pay() {
  const router = useRouter();
  const { 
    isInstalled, 
    username, 
    isLoading, 
    walletAuthenticated, 
    walletAddress,
    initiateWalletAuth,
    balance 
  } = useMiniKitContext();
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [isResolvingUsername, setIsResolvingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  
  // Recent recipients (mock data)
  const recentRecipients = [
    { id: 1, name: 'Alex Smith', address: '0x123...456', fullAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', avatar: '/profile.svg' },
    { id: 2, name: 'Jamie Rodriguez', address: '0x789...012', fullAddress: '0x1234567890123456789012345678901234567890', avatar: '/profile.svg' },
    { id: 3, name: 'Taylor Johnson', address: '0x345...678', fullAddress: '0x0987654321098765432109876543210987654321', avatar: '/profile.svg' },
  ];

  // Handle username resolution
  const resolveUsername = async (username) => {
    if (!username || username.startsWith('0x') || username.length < 3) {
      setResolvedAddress('');
      setUsernameError('');
      return;
    }
    
    setIsResolvingUsername(true);
    setUsernameError('');
    
    try {
      const response = await fetch(`https://usernames.worldcoin.org/api/v1/${username}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setUsernameError('Username not found');
        } else {
          setUsernameError('Error resolving username');
        }
        setResolvedAddress('');
        setIsResolvingUsername(false);
        return;
      }
      
      const data = await response.json();
      setResolvedAddress(data.address);
    } catch (error) {
      console.error('Error resolving username:', error);
      setUsernameError('Error resolving username');
      setResolvedAddress('');
    } finally {
      setIsResolvingUsername(false);
    }
  };
  
  // Handle recipient input change
  const handleRecipientChange = (e) => {
    const value = e.target.value;
    setRecipient(value);
    
    // Debounce username resolution with a slight delay
    const timeoutId = setTimeout(() => {
      if (value && !value.startsWith('0x')) {
        resolveUsername(value);
      } else {
        setResolvedAddress('');
        setUsernameError('');
      }
    }, 500);
    
    return () => clearTimeout(timeoutId);
  };

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

  // Set up payment response listener
  useEffect(() => {
    if (!MiniKit.isInstalled()) {
      return;
    }

    // Subscribe to payment response events
    MiniKit.subscribe(
      ResponseEvent.MiniAppPayment,
      async (response) => {
        console.log("Payment response received:", response);
        setIsProcessing(false);
        
        if (response.status === "success") {
          try {
            // Verify the payment with our backend
            const res = await fetch(`/api/confirm-payment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });
            
            const payment = await res.json();
            if (payment.success) {
              setPaymentSuccess(true);
              // Reset form after success
              setTimeout(() => {
                setPaymentSuccess(false);
                setRecipient('');
                setAmount('');
                setNote('');
              }, 3000);
            } else {
              setPaymentError("Payment verification failed");
            }
          } catch (error) {
            console.error("Error verifying payment:", error);
            setPaymentError("Error verifying payment");
          }
        } else {
          setPaymentError(response.message || "Payment failed");
        }
      }
    );

    // Cleanup on unmount
    return () => {
      MiniKit.unsubscribe(ResponseEvent.MiniAppPayment);
    };
  }, []);

  // Handle payment submission
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!recipient || !amount) return;
    
    setIsProcessing(true);
    setPaymentError('');
    
    try {
      // Step 1: Get payment reference ID from our backend
      const res = await fetch('/api/initiate-payment', {
        method: 'POST'
      });
      
      if (!res.ok) {
        throw new Error('Failed to initiate payment');
      }
      
      const { id } = await res.json();
      
      // Step 2: Prepare payment payload
      const targetAddress = recipient.length > 20 ? recipient : 
        resolvedAddress || recentRecipients.find(r => r.name === recipient)?.fullAddress || recipient;
      
      const payload = {
        reference: id,
        to: targetAddress,
        tokens: [
          {
            symbol: Tokens.USDCE,
            token_amount: tokenToDecimals(parseFloat(amount), Tokens.USDCE).toString()
          }
        ],
        description: note || "Payment from SuperWorld app"
      };
      
      console.log("Sending payment with payload:", payload);
      
      // Step 3: Send payment command to MiniKit
      if (MiniKit.isInstalled()) {
        MiniKit.commands.pay(payload);
      } else {
        setIsProcessing(false);
        setPaymentError("MiniKit is not installed");
      }
    } catch (error) {
      console.error("Payment error:", error);
      setIsProcessing(false);
      setPaymentError(error.message || "Payment failed");
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

  // If not authenticated, show authentication prompt
  if (!walletAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 font-['Inter']">
        <Head>
          <title>Make a Payment - World Super App</title>
          <meta name="description" content="Send money to friends and family" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <main className="max-w-[480px] mx-auto px-5 py-4 pb-20 relative min-h-screen">
          {/* Header */}
          <header className="flex justify-between items-center py-3">
            <button 
              onClick={() => router.back()}
              className="bg-white rounded-full p-2 shadow-sm"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.41 16.59L10.83 12L15.41 7.41L14 6L8 12L14 18L15.41 16.59Z" fill="#4B5563"/>
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-800">Pay</h1>
            <div className="w-10"></div> {/* Placeholder for alignment */}
          </header>

          <div className="mt-20 flex flex-col items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-sm max-w-sm w-full text-center">
              <div className="mb-6">
                <Image 
                  src="/icon-money-3d-illustration-png.png"
                  alt="Money Illustration" 
                  width={160}
                  height={160}
                  className="mx-auto object-contain"
                  priority
                />
              </div>
              <h1 className="text-2xl font-semibold text-gray-800 mb-4">Sign In Required</h1>
              <p className="text-gray-600 mb-6">Connect your wallet to make payments</p>
              
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
                    Signing in...
                  </>
                ) : 'Sign in'}
              </button>
            </div>
          </div>

          {/* Bottom Navigation - Simplified */}
          <nav className="fixed bottom-0 left-0 right-0 flex justify-around items-center h-14 bg-white shadow-md max-w-[480px] mx-auto border-t border-gray-100">
            <button 
              onClick={() => router.push('/portfolio')}
              className="w-1/3 flex items-center justify-center"
            >
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
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-['Inter']">
      <Head>
        <title>Make a Payment - World Super App</title>
        <meta name="description" content="Send money to friends and family" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Success Modal */}
      {paymentSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 p-3 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Payment Successful!</h3>
            <p className="text-gray-600 mb-6">Your payment of ${amount} has been sent successfully.</p>
          </div>
        </div>
      )}

      <main className="max-w-[480px] mx-auto px-5 py-4 pb-20 relative min-h-screen overflow-auto">
        {/* Header */}
        <header className="flex justify-between items-center py-3">
          <button 
            onClick={() => router.back()}
            className="bg-white rounded-full p-2 shadow-sm"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.41 16.59L10.83 12L15.41 7.41L14 6L8 12L14 18L15.41 16.59Z" fill="#4B5563"/>
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-800">Pay</h1>
          <div className="w-10"></div> {/* Placeholder for alignment */}
        </header>

        {/* Payment Form */}
        <div className="mt-6">
          <form onSubmit={handleSubmitPayment}>
            <div className="p-6 bg-white rounded-2xl shadow-sm mb-5">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Send Money</h3>
              
              {/* Available Balance */}
              <div className="bg-gray-50 p-3 rounded-lg mb-5">
                <p className="text-sm text-gray-500">Available Balance</p>
                <p className="text-lg font-semibold text-gray-800">${balance}</p>
              </div>
              
              {/* Error Message */}
              {paymentError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-5">
                  <p>{paymentError}</p>
                </div>
              )}
              
              {/* Recipient Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Address or Username
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={recipient}
                    onChange={handleRecipientChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter wallet address or username"
                    required
                  />
                  {isResolvingUsername && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                  {resolvedAddress && !isResolvingUsername && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  )}
                  {usernameError && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  )}
                </div>
                {resolvedAddress && (
                  <p className="text-xs text-gray-600 mt-1 flex items-center">
                    <span className="mr-1">Address:</span>
                    <span className="font-mono truncate">{resolvedAddress}</span>
                  </p>
                )}
                {usernameError && (
                  <p className="text-xs text-red-500 mt-1">{usernameError}</p>
                )}
              </div>
              
              {/* Amount Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (USDC)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-3 pl-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                    min="0.1"
                    step="0.01"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum payment amount: $0.10</p>
              </div>
              
              {/* Note Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note (Optional)
                </label>
                <input 
                  type="text" 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="What's this payment for?"
                />
              </div>
              
              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProcessing || !recipient || !amount || parseFloat(amount) < 0.1}
                className={`w-full py-3 px-4 ${
                  isProcessing || !recipient || !amount || parseFloat(amount) < 0.1
                    ? 'bg-indigo-300' 
                    : 'bg-indigo-500 hover:bg-indigo-600'
                } text-white rounded-xl transition-colors flex justify-center items-center`}
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : 'Send Payment'}
              </button>
            </div>
          </form>
          
          {/* Recent Recipients */}
          <div className="p-6 bg-white rounded-2xl shadow-sm">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Recent Recipients</h3>
            
            <div className="divide-y divide-gray-100">
              {recentRecipients.map(recipient => (
                <button 
                  key={recipient.id}
                  onClick={() => setRecipient(recipient.fullAddress)}
                  className="flex items-center py-3 w-full text-left hover:bg-gray-50 transition-colors rounded-lg px-2"
                >
                  <div className="bg-gray-100 p-2 rounded-full mr-3">
                    <Image src={recipient.avatar} alt={recipient.name} width={28} height={28} />
                  </div>
                  <div>
                    <h4 className="text-gray-800">{recipient.name}</h4>
                    <p className="text-sm text-gray-500">{recipient.address}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Navigation - Simplified */}
        <nav className="fixed bottom-0 left-0 right-0 flex justify-around items-center h-14 bg-white shadow-md max-w-[480px] mx-auto border-t border-gray-100">
          <button 
            onClick={() => router.push('/portfolio')}
            className="w-1/3 flex items-center justify-center"
          >
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
      </main>
    </div>
  );
} 