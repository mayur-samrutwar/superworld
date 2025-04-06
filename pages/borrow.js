import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import { useMiniKitContext } from '../contexts/MiniKitContext';
import { MiniKit } from '@worldcoin/minikit-js';
import lendingAbi from '../contracts/abi/lending.json';

export default function Borrow() {
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
  const [amount, setAmount] = useState(100);
  const [interest, setInterest] = useState('5.8');
  const [term, setTerm] = useState(90); // days
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loanDetails, setLoanDetails] = useState({
    totalAmount: 0,
    paidAmount: 0,
    nextPayment: 0,
    paymentAmount: 0,
    isDefaulted: false,
    hasActiveLoan: false
  });
  const [contractInfo, setContractInfo] = useState({
    borrowRate: 13, // 13% APR 
    maxBorrow: 0.1, // 0.1 ETH
    liquidationPeriod: 60 // 60 days
  });
  
  const dialRef = useRef(null);
  const knobRef = useRef(null);
  
  // Maximum borrow amount (can be dynamic based on credit score)
  const maxAmount = 800;
  
  // Contract address from environment variables
  const contractAddress = process.env.NEXT_PUBLIC_LENDING_CONTRACT_ADDRESS || '0x4762C2F2C670e87450CEdf740Ef7107aba5a00ba';
  
  // Calculate interest to pay
  const calculateInterest = (principal, rate, timeDays) => {
    // Simple interest calculation for demonstration
    return ((principal * (rate / 100) * timeDays) / 365).toFixed(2);
  };
  
  // Calculate total to repay
  const totalRepayment = () => {
    const interestAmount = parseFloat(calculateInterest(amount, parseFloat(interest), term));
    return (amount + interestAmount).toFixed(2);
  };
  
  // Handle circular dial interaction
  useEffect(() => {
    const dial = dialRef.current;
    const knob = knobRef.current;
    
    if (!dial || !knob) return;
    
    const updateKnobPosition = (clientX, clientY) => {
      const dialRect = dial.getBoundingClientRect();
      const dialCenterX = dialRect.left + dialRect.width / 2;
      const dialCenterY = dialRect.top + dialRect.height / 2;
      
      // Calculate angle based on mouse position relative to dial center
      let angle = Math.atan2(clientY - dialCenterY, clientX - dialCenterX);
      
      // Convert angle to degrees, adjust to start from top (270 degrees)
      let angleDegrees = angle * (180 / Math.PI);
      angleDegrees = (angleDegrees + 270) % 360;
      
      // Restrict to 0-270 degrees (bottom half and right side)
      if (angleDegrees > 270) {
        angleDegrees = 0;
      }
      
      // Convert angle to percentage of max amount
      const percentage = angleDegrees / 270;
      const newAmount = Math.round(percentage * maxAmount);
      setAmount(newAmount === 0 ? 1 : newAmount); // Minimum 1
    };
    
    const handleMouseDown = (e) => {
      setIsDragging(true);
      updateKnobPosition(e.clientX, e.clientY);
    };
    
    const handleMouseMove = (e) => {
      if (isDragging) {
        updateKnobPosition(e.clientX, e.clientY);
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    const handleTouchStart = (e) => {
      setIsDragging(true);
      const touch = e.touches[0];
      updateKnobPosition(touch.clientX, touch.clientY);
    };
    
    const handleTouchMove = (e) => {
      if (isDragging) {
        const touch = e.touches[0];
        updateKnobPosition(touch.clientX, touch.clientY);
      }
    };
    
    const handleTouchEnd = () => {
      setIsDragging(false);
    };
    
    dial.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    dial.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      dial.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      dial.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, maxAmount]);
  
  // Update knob position when amount changes
  useEffect(() => {
    const knob = knobRef.current;
    if (!knob) return;
    
    // Calculate angle based on amount
    const percentage = amount / maxAmount;
    const angle = percentage * 270; // 270 degrees is the max rotation
    
    // Calculate x,y coordinates on the circle
    const radius = 120; // radius of the dial in pixels
    const radians = (angle - 270) * (Math.PI / 180); // convert to radians, adjust to start from top
    const x = radius * Math.cos(radians);
    const y = radius * Math.sin(radians);
    
    // Apply transform to move the knob
    knob.style.transform = `translate(${x}px, ${y}px)`;
  }, [amount, maxAmount]);
  
  // Handle amount change from input
  const handleAmountChange = (e) => {
    const value = parseInt(e.target.value) || 0;
    if (value <= maxAmount) {
      setAmount(value);
    }
  };
  
  // Format date nicely
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString();
  };
  
  // Handle wallet connection
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
  
  // Fetch contract info and loan details when component mounts
  useEffect(() => {
    const fetchContractInfo = async () => {
      if (!MiniKit.isInstalled() || !walletAuthenticated) return;
      
      try {
        // Set default contract info based on the contract code
        setContractInfo({
          borrowRate: 13, // 13% APR (1300 basis points)
          maxBorrow: 0.1, // 0.1 ETH
          liquidationPeriod: 60 // 60 days
        });
        
        // We can't directly call view functions through MiniKit in World App
        // Instead, we'll rely on predefined contract values
        
        // For an active loan, we'd need to use a backend API or alternative method
        // to fetch loan details for the connected wallet
        if (walletAddress) {
          // For now, we'll simulate no active loan
          setLoanDetails({
            totalAmount: 0,
            paidAmount: 0,
            nextPayment: 0,
            paymentAmount: 0,
            isDefaulted: false,
            hasActiveLoan: false
          });
        }
      } catch (error) {
        console.error('Error fetching contract info:', error);
      }
    };
    
    fetchContractInfo();
  }, [walletAuthenticated, contractAddress, walletAddress]);
  
  // Handle borrow (take loan) submission
  const handleBorrowSubmit = async () => {
    setIsProcessing(true);
    setErrorMessage('');
    
    try {
      // Create transaction object for taking a loan
      const txPayload = {
        transaction: [
          {
            address: contractAddress,
            abi: lendingAbi,
            functionName: "takeLoan",
            args: []
          }
        ]
      };
      
      console.log('Sending takeLoan transaction with payload:', JSON.stringify(txPayload));
      
      // Use the World App's sendTransaction method
      const { commandPayload, finalPayload } = await MiniKit.commandsAsync.sendTransaction(txPayload);
      
      console.log('Transaction response:', JSON.stringify(finalPayload));
      
      // Check if transaction was successful
      if (finalPayload && finalPayload.status === 'success') {
        // Transaction successful
        const txId = finalPayload.transaction_id;
        console.log('Transaction was sent successfully with ID:', txId);
        
        setTxHash(txId);
        setShowSuccess(true);
        
        // Update loan details after successful loan
        setLoanDetails({
          totalAmount: contractInfo.maxBorrow,
          paidAmount: 0,
          nextPayment: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days from now
          paymentAmount: (contractInfo.maxBorrow * contractInfo.borrowRate) / (100 * 12), // Monthly payment
          isDefaulted: false,
          hasActiveLoan: true
        });
        
        // Hide success message after 5 seconds
        setTimeout(() => {
          setShowSuccess(false);
        }, 5000);
      } else {
        // Transaction sending failed or was rejected
        const errorMsg = finalPayload?.message || 'Transaction failed';
        console.error('Transaction failed:', errorMsg);
        setErrorMessage(`Transaction Error: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Error during loan transaction:', error);
      // Display the full error message on the page
      setErrorMessage(`Error: ${error.toString()}`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle loan repayment
  const handleRepayLoan = async () => {
    if (!loanDetails.hasActiveLoan) {
      setErrorMessage('No active loan to repay');
      return;
    }
    
    setIsProcessing(true);
    setErrorMessage('');
    
    try {
      // Convert payment amount to wei
      const paymentInWei = BigInt(Math.floor(loanDetails.paymentAmount * 1e18));
      // Convert to hex string with 0x prefix
      const paymentHex = "0x" + paymentInWei.toString(16);
      
      // Create transaction object for repaying the loan
      const txPayload = {
        transaction: [
          {
            address: contractAddress,
            abi: lendingAbi,
            functionName: "repayLoan",
            args: [],
            value: paymentHex // Send ETH with the transaction as hex string
          }
        ]
      };
      
      console.log('Sending repayLoan transaction with payload:', JSON.stringify(txPayload));
      
      // Use the World App's sendTransaction method
      const { commandPayload, finalPayload } = await MiniKit.commandsAsync.sendTransaction(txPayload);
      
      console.log('Transaction response:', JSON.stringify(finalPayload));
      
      // Check if transaction was successful
      if (finalPayload && finalPayload.status === 'success') {
        // Transaction successful
        const txId = finalPayload.transaction_id;
        console.log('Transaction was sent successfully with ID:', txId);
        
        setTxHash(txId);
        setShowSuccess(true);
        
        // Update loan details after successful payment
        setLoanDetails({
          ...loanDetails,
          paidAmount: loanDetails.paidAmount + loanDetails.paymentAmount,
          nextPayment: Date.now() + (30 * 24 * 60 * 60 * 1000), // Next payment in 30 days
        });
        
        // Hide success message after 5 seconds
        setTimeout(() => {
          setShowSuccess(false);
        }, 5000);
      } else {
        // Transaction sending failed or was rejected
        const errorMsg = finalPayload?.message || 'Transaction failed';
        console.error('Transaction failed:', errorMsg);
        setErrorMessage(`Transaction Error: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Error during loan repayment transaction:', error);
      // Display the full error message on the page
      setErrorMessage(`Error: ${error.toString()}`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Calculate monthly payment
  const monthlyPayment = () => {
    const totalAmount = parseFloat(totalRepayment());
    return (totalAmount / (term / 30)).toFixed(2);
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
          <title>Borrow - World Super App</title>
          <meta name="description" content="Borrow money with low interest rates" />
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
            <h1 className="text-lg font-semibold text-gray-800">Borrow</h1>
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
              <p className="text-gray-600 mb-6">Connect your wallet to access borrowing</p>
              
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

          {/* Bottom Navigation */}
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
        <title>Borrow - World Super App</title>
        <meta name="description" content="Borrow money with low interest rates" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Success Banner */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 p-3 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">
              {loanDetails.hasActiveLoan ? 'Payment Successful!' : 'Loan Approved!'}
            </h3>
            {loanDetails.hasActiveLoan ? (
              <p className="text-gray-600 mb-3">You've successfully made a payment of {loanDetails.paymentAmount.toFixed(4)} ETH.</p>
            ) : (
              <p className="text-gray-600 mb-3">You've successfully borrowed {contractInfo.maxBorrow} ETH. The monthly payment is {((contractInfo.maxBorrow * contractInfo.borrowRate) / (100 * 12)).toFixed(4)} ETH.</p>
            )}
            {txHash && (
              <div className="mt-2 bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600 font-medium mb-1">Transaction Hash:</p>
                <p className="font-mono text-xs break-all text-gray-800">{txHash}</p>
              </div>
            )}
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
          <h1 className="text-lg font-semibold text-gray-800">Borrow</h1>
          <div className="w-10"></div> {/* Placeholder for alignment */}
        </header>

        {/* Borrowing Form */}
        <div className="mt-6">
          <div className="p-6 bg-white rounded-2xl shadow-sm mb-5">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              {loanDetails.hasActiveLoan ? 'Your Active Loan' : 'Borrow Money'}
            </h3>
            
            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4">
                <p className="text-sm">{errorMessage}</p>
              </div>
            )}
            
            {/* Contract Info */}
            <div className="bg-purple-50 p-3 rounded-lg mb-5">
              <p className="text-sm font-medium text-purple-700">Loan Terms</p>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-purple-600">Interest Rate (APR)</span>
                <span className="text-xs font-medium text-purple-900">{contractInfo.borrowRate}%</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-purple-600">Max Borrow Amount</span>
                <span className="text-xs font-medium text-purple-900">{contractInfo.maxBorrow} ETH</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-purple-600">Default Period</span>
                <span className="text-xs font-medium text-purple-900">{contractInfo.liquidationPeriod} days</span>
              </div>
            </div>
            
            {/* Active Loan Details */}
            {loanDetails.hasActiveLoan ? (
              <div className="mb-6">
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Loan Amount</span>
                    <span className="text-sm font-medium text-gray-800">{loanDetails.totalAmount.toFixed(4)} ETH</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Paid So Far</span>
                    <span className="text-sm font-medium text-green-600">{loanDetails.paidAmount.toFixed(4)} ETH</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Remaining</span>
                    <span className="text-sm font-medium text-gray-800">
                      {(loanDetails.totalAmount - loanDetails.paidAmount).toFixed(4)} ETH
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Next Payment Due</span>
                    <span className="text-sm font-medium text-gray-800">{formatDate(loanDetails.nextPayment)}</span>
                  </div>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="p-4 bg-gray-50 rounded-lg w-full mb-4">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">Monthly Payment</span>
                      <span className="text-sm font-medium text-gray-800">{loanDetails.paymentAmount.toFixed(4)} ETH</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleRepayLoan}
                    disabled={isProcessing || loanDetails.isDefaulted}
                    className={`w-full py-3 px-4 ${
                      isProcessing || loanDetails.isDefaulted
                        ? 'bg-purple-300' 
                        : 'bg-purple-600 hover:bg-purple-700'
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
                    ) : loanDetails.isDefaulted ? 'Loan Defaulted' : 'Make Payment'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center mb-6">
                <div className="p-4 bg-gray-50 rounded-lg w-full mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">Loan Amount</span>
                    <span className="text-sm font-medium text-gray-800">{contractInfo.maxBorrow} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Monthly Payment</span>
                    <span className="text-sm font-medium text-gray-800">
                      {((contractInfo.maxBorrow * contractInfo.borrowRate) / (100 * 12)).toFixed(4)} ETH
                    </span>
                  </div>
                </div>
                
                <div className="w-full mb-2">
                  <p className="text-xs text-gray-500 mb-4 text-center">
                    Borrowing {contractInfo.maxBorrow} ETH at {contractInfo.borrowRate}% APR
                  </p>
                </div>
                
                <button
                  onClick={handleBorrowSubmit}
                  disabled={isProcessing}
                  className={`w-full py-3 px-4 ${
                    isProcessing
                      ? 'bg-purple-300' 
                      : 'bg-purple-600 hover:bg-purple-700'
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
                  ) : 'Borrow Now'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Navigation */}
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