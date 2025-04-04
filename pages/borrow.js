import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useState, useEffect, useRef } from 'react';
import { useMiniKitContext } from '../contexts/MiniKitContext';

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
  
  const dialRef = useRef(null);
  const knobRef = useRef(null);
  
  // Maximum borrow amount (can be dynamic based on credit score)
  const maxAmount = 800;
  
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
  
  // Handle borrow submission
  const handleBorrowSubmit = () => {
    if (amount <= 0 || amount > maxAmount) return;
    
    setIsProcessing(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsProcessing(false);
      setShowSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    }, 1500);
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
            <h3 className="text-xl font-semibold text-gray-800 mb-3">Loan Approved!</h3>
            <p className="text-gray-600 mb-6">${amount} has been added to your wallet. Your monthly payment will be ${monthlyPayment()}.</p>
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
            <h3 className="text-lg font-medium text-gray-800 mb-4">Borrow Money</h3>
            
            {/* User Credit Score */}
            <div className="bg-gray-50 p-3 rounded-lg mb-5">
              <div className="flex justify-between">
                <p className="text-sm text-gray-500">Credit Score</p>
                <p className="text-sm font-medium text-emerald-600">Good</p>
              </div>
              <div className="h-2 bg-gray-200 rounded-full mt-2">
                <div className="h-2 bg-emerald-500 rounded-full" style={{ width: '75%' }}></div>
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
                    stroke="#a855f7"
                    strokeWidth="8"
                    strokeDasharray={`${amount / maxAmount * 820} 820`}
                    strokeLinecap="round"
                  />
                </svg>
                
                {/* Center amount display */}
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-3xl font-bold text-gray-800">${amount}</span>
                  <span className="text-sm text-gray-500">Loan Amount</span>
                </div>
                
                {/* Draggable knob */}
                <div 
                  ref={knobRef}
                  className="absolute top-1/2 left-1/2 w-8 h-8 bg-purple-500 rounded-full shadow-md transform -translate-x-1/2 -translate-y-1/2 cursor-grab"
                  style={{ touchAction: 'none' }}
                />
              </div>
              
              {/* Amount Input */}
              <div className="w-full max-w-xs mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount to Borrow
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input 
                    type="number"
                    value={amount}
                    onChange={handleAmountChange}
                    className="w-full p-3 pl-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    min="1"
                    max={maxAmount}
                    step="1"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Maximum borrowing limit: ${maxAmount}</p>
              </div>
              
              {/* Loan Terms Selector */}
              <div className="w-full max-w-xs mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loan Term
                </label>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => setTerm(30)}
                    className={`flex-1 py-2 px-3 rounded-lg ${term === 30 ? 'bg-purple-100 text-purple-700 font-medium' : 'bg-gray-100 text-gray-600'}`}
                  >
                    30 days
                  </button>
                  <button 
                    onClick={() => setTerm(90)}
                    className={`flex-1 py-2 px-3 rounded-lg ${term === 90 ? 'bg-purple-100 text-purple-700 font-medium' : 'bg-gray-100 text-gray-600'}`}
                  >
                    90 days
                  </button>
                  <button 
                    onClick={() => setTerm(180)}
                    className={`flex-1 py-2 px-3 rounded-lg ${term === 180 ? 'bg-purple-100 text-purple-700 font-medium' : 'bg-gray-100 text-gray-600'}`}
                  >
                    180 days
                  </button>
                </div>
              </div>
              
              {/* Borrowing Details */}
              <div className="w-full max-w-xs bg-gray-50 rounded-xl p-4 mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Interest Rate</span>
                  <span className="text-sm font-medium text-gray-800">{interest}%</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Loan Duration</span>
                  <span className="text-sm font-medium text-gray-800">{term} days</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Interest Amount</span>
                  <span className="text-sm font-medium text-purple-600">${calculateInterest(amount, parseFloat(interest), term)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-600">Total Repayment</span>
                    <span className="text-sm font-medium text-gray-800">${totalRepayment()}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-gray-600">Monthly Payment</span>
                    <span className="text-sm font-medium text-gray-800">~${monthlyPayment()}</span>
                  </div>
                </div>
              </div>
              
              {/* Submit Button */}
              <button
                onClick={handleBorrowSubmit}
                disabled={isProcessing || amount <= 0 || amount > maxAmount}
                className={`w-full max-w-xs py-3 px-4 ${
                  isProcessing || amount <= 0 || amount > maxAmount
                    ? 'bg-purple-300' 
                    : 'bg-purple-500 hover:bg-purple-600'
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