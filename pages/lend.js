import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import { useMiniKitContext } from '../contexts/MiniKitContext';
import { MiniKit } from '@worldcoin/minikit-js';
import lendingAbi from '../contracts/abi/lending.json';

export default function Lend() {
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
  const [amount, setAmount] = useState(0.1); // Start with a reasonable minimum
  const [lockMonths, setLockMonths] = useState(3); // minimum 3 months based on contract
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [contractInfo, setContractInfo] = useState({
    lendRate: 12, // 12% APY
    maxLend: 1, // 1 ETH
    minLockMonths: 3
  });
  
  const dialRef = useRef(null);
  const knobRef = useRef(null);
  
  // Maximum lend amount based on contract (1 ETH)
  const maxAmount = 1; // in ETH
  
  // Contract address from environment variables
  const contractAddress = process.env.NEXT_PUBLIC_LENDING_CONTRACT_ADDRESS || '0x4762C2F2C670e87450CEdf740Ef7107aba5a00ba';
  
  // Initialize with contract info from contract code
  useEffect(() => {
    // Set default values from the contract
    setContractInfo({
      lendRate: 12, // 12% APY (1200 basis points)
      maxLend: 1, // 1 ETH
      minLockMonths: 3 // 3 month minimum lock
    });
  }, []);
  
  // Calculate interest earned
  const calculateInterest = (principal, rate, months) => {
    // APY calculation with monthly compounding (approximate)
    const annualRate = rate / 100;
    return ((principal * annualRate * months) / 12).toFixed(4);
  };
  
  // Calculate total return
  const totalReturn = () => {
    const interestEarned = parseFloat(calculateInterest(amount, contractInfo.lendRate, lockMonths));
    return (amount + interestEarned).toFixed(4);
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
      const newAmount = parseFloat((percentage * maxAmount).toFixed(4));
      setAmount(newAmount === 0 ? 0.01 : newAmount); // Minimum 0.01 ETH
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
    const value = parseFloat(e.target.value) || 0;
    if (value <= maxAmount) {
      setAmount(value);
    }
  };
  
  // Handle lock period change
  const handleLockMonthsChange = (e) => {
    const value = parseInt(e.target.value) || contractInfo.minLockMonths;
    setLockMonths(Math.max(value, contractInfo.minLockMonths));
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
  
  // Handle lend submission
  const handleLendSubmit = async () => {
    if (amount <= 0 || amount > maxAmount) {
      setErrorMessage('Amount should be between 0 and ' + maxAmount + ' ETH');
      return;
    }
    
    if (lockMonths < contractInfo.minLockMonths) {
      setErrorMessage(`Lock period should be at least ${contractInfo.minLockMonths} months`);
      return;
    }
    
    setIsProcessing(true);
    setErrorMessage('');
    
    try {
      // Convert ETH amount to wei
      const amountInWei = BigInt(Math.floor(amount * 1e18));
      // Convert to hex string with 0x prefix
      const amountHex = "0x" + amountInWei.toString(16);
      
      console.log('Amount in ETH:', amount);
      console.log('Amount in Wei (BigInt):', amountInWei.toString());
      console.log('Amount in Hex:', amountHex);
      console.log('Lock months:', lockMonths);
      console.log('Contract address:', contractAddress);
      
      // Ensure lockMonths is a number
      const lockMonthsValue = parseInt(lockMonths, 10);
      
      // Create transaction object for sending to the contract
      const txPayload = {
        transaction: [
          {
            address: contractAddress,
            abi: lendingAbi,
            functionName: "deposit",
            args: [lockMonthsValue],
            value: amountHex // Send ETH with the transaction as hex string
          }
        ]
      };
      
      console.log('Sending deposit transaction with payload:', JSON.stringify(txPayload, null, 2));
      
      // Use the World App's sendTransaction method following the docs
      const result = await MiniKit.commandsAsync.sendTransaction(txPayload);
      console.log('Full transaction result:', JSON.stringify(result, null, 2));
      
      const { commandPayload, finalPayload } = result;
      
      console.log('Transaction response:', JSON.stringify(finalPayload, null, 2));
      
      // Check if transaction was successful
      if (finalPayload && finalPayload.status === 'success') {
        // Transaction successful
        const txId = finalPayload.transaction_id;
        console.log('Transaction was sent successfully with ID:', txId);
        
        setTxHash(txId);
        setShowSuccess(true);
        
        // Hide success message after 5 seconds
        setTimeout(() => {
          setShowSuccess(false);
        }, 5000);
      } else {
        // Transaction sending failed or was rejected
        const errorMsg = finalPayload?.message || 'Transaction failed';
        console.error('Transaction failed:', errorMsg);
        setErrorMessage(`Transaction Error: ${errorMsg}`);
        
        // Show more detailed error info if available
        if (finalPayload?.error) {
          console.error('Error details:', finalPayload.error);
          setErrorMessage(`Transaction Error: ${errorMsg}\nDetails: ${JSON.stringify(finalPayload.error)}`);
        }
      }
    } catch (error) {
      console.error('Error during lending transaction:', error);
      // Display the full error message on the page
      let errorMsg = `Error: ${error.cause.toString()}`;
      
      // Log the full error object
      console.error('Full error object:', error);
      
      // If error has more details, show them
      if (error.message) console.error('Error message:', error.message);
      if (error.stack) console.error('Error stack:', error.stack);
      if (error.cause) console.error('Error cause:', error.cause);
      
      setErrorMessage(errorMsg);
    } finally {
      setIsProcessing(false);
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
          <title>Lend - World Super App</title>
          <meta name="description" content="Lend money and earn interest" />
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
            <h1 className="text-lg font-semibold text-gray-800">Lend</h1>
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
              <p className="text-gray-600 mb-6">Connect your wallet to start lending</p>
              
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
        <title>Lend - World Super App</title>
        <meta name="description" content="Lend money and earn interest" />
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
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Lending Successful!</h3>
            <p className="text-gray-600 mb-3">You've successfully lent {amount} ETH for {lockMonths} months. You'll earn approximately {calculateInterest(amount, contractInfo.lendRate, lockMonths)} ETH in interest.</p>
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
          <h1 className="text-lg font-semibold text-gray-800">Lend</h1>
          <div className="w-10"></div> {/* Placeholder for alignment */}
        </header>

        {/* Lending Form */}
        <div className="mt-6">
          <div className="p-6 bg-white rounded-2xl shadow-sm mb-5">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Lend Money</h3>
            
            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4">
                <p className="text-sm">{errorMessage}</p>
              </div>
            )}
            
            {/* Available Balance */}
            <div className="bg-gray-50 p-3 rounded-lg mb-5">
              <p className="text-sm text-gray-500">Available Balance</p>
              <p className="text-lg font-semibold text-gray-800">{balance} WLD</p>
            </div>
            
            {/* Contract Info */}
            <div className="bg-indigo-50 p-3 rounded-lg mb-5">
              <p className="text-sm font-medium text-indigo-700">Contract Details</p>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-indigo-600">Interest Rate (APY)</span>
                <span className="text-xs font-medium text-indigo-900">{contractInfo.lendRate}%</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-indigo-600">Max Lend Amount</span>
                <span className="text-xs font-medium text-indigo-900">{contractInfo.maxLend} ETH</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-indigo-600">Min Lock Period</span>
                <span className="text-xs font-medium text-indigo-900">{contractInfo.minLockMonths} months</span>
              </div>
            </div>
            
            {/* Circular Dial */}
            <div className="flex flex-col items-center justify-center mb-6">
              <div 
                ref={dialRef}
                className="relative w-64 h-64 rounded-full border-8 border-gray-100 mb-5"
                style={{ touchAction: 'none' }}
              >
                {/* Dial markings */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-full rounded-full flex items-center justify-center">
                    <div className="relative w-full h-full">
                      {/* Min marker */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 text-xs font-medium text-gray-500">
                        $0
                      </div>
                      {/* Mid marker */}
                      <div className="absolute top-1/2 right-0 translate-x-4 text-xs font-medium text-gray-500">
                        ${maxAmount / 2}
                      </div>
                      {/* Max marker */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-4 text-xs font-medium text-gray-500">
                        ${maxAmount}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Active arc - Progress indicator */}
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="45%"
                    fill="none"
                    stroke="#f3f4f6"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50%"
                    cy="50%"
                    r="45%"
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="8"
                    strokeDasharray={`${amount / maxAmount * 820} 820`}
                    strokeLinecap="round"
                  />
                </svg>
                
                {/* Center amount display */}
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-3xl font-bold text-gray-800">${amount}</span>
                  <span className="text-sm text-gray-500">Lend Amount</span>
                </div>
                
                {/* Draggable knob */}
                <div 
                  ref={knobRef}
                  className="absolute top-1/2 left-1/2 w-8 h-8 bg-indigo-500 rounded-full shadow-md transform -translate-x-1/2 -translate-y-1/2 cursor-grab"
                  style={{ touchAction: 'none' }}
                />
              </div>
              
              {/* Amount Input */}
              <div className="w-full max-w-xs mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount to Lend (ETH)
                </label>
                <div className="relative">
                  <input 
                    type="number"
                    value={amount}
                    onChange={handleAmountChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="0.01"
                    max={maxAmount}
                    step="0.01"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Maximum lend amount: {maxAmount} ETH</p>
              </div>
              
              {/* Lock Period Input */}
              <div className="w-full max-w-xs mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lock Period (Months)
                </label>
                <div className="relative">
                  <input 
                    type="number"
                    value={lockMonths}
                    onChange={handleLockMonthsChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min={contractInfo.minLockMonths}
                    step="1"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum lock period: {contractInfo.minLockMonths} months</p>
              </div>
              
              {/* Lending Details */}
              <div className="w-full max-w-xs bg-gray-50 rounded-xl p-4 mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Interest Rate (APY)</span>
                  <span className="text-sm font-medium text-gray-800">{contractInfo.lendRate}%</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Lock Period</span>
                  <span className="text-sm font-medium text-gray-800">{lockMonths} months</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Interest Earned</span>
                  <span className="text-sm font-medium text-green-600">+{calculateInterest(amount, contractInfo.lendRate, lockMonths)} ETH</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Total Return</span>
                    <span className="text-sm font-medium text-gray-800">{totalReturn()} ETH</span>
                  </div>
                </div>
              </div>
              
              {/* Submit Button */}
              <button
                onClick={handleLendSubmit}
                disabled={isProcessing || amount <= 0 || amount > maxAmount || lockMonths < contractInfo.minLockMonths}
                className={`w-full max-w-xs py-3 px-4 ${
                  isProcessing || amount <= 0 || amount > maxAmount || lockMonths < contractInfo.minLockMonths
                    ? 'bg-emerald-300' 
                    : 'bg-emerald-500 hover:bg-emerald-600'
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
                ) : 'Lend Now'}
              </button>
            </div>
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