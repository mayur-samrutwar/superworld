import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { MiniKitProvider, useMiniKitContext } from '../contexts/MiniKitContext';
import '../styles/globals.css';

// Wrapper component that checks for referral status
function AppWrapper({ Component, pageProps }) {
  const router = useRouter();
  const { walletAuthenticated, hasReferral, checkReferralStatus } = useMiniKitContext();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Skip restriction check if already on restricted page or login page
    if (router.pathname === '/restricted') {
      setIsChecking(false);
      return;
    }

    // Check referral status when user is authenticated
    if (walletAuthenticated) {
      const userHasReferral = checkReferralStatus();
      
      // If authenticated but no referral, redirect to restricted page
      if (!userHasReferral && router.pathname !== '/restricted') {
        router.push('/restricted');
      }
    }
    
    setIsChecking(false);
  }, [walletAuthenticated, router.pathname]);

  // Prevent flash of content during check
  if (isChecking) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  // Allow access to restricted page without referral
  if (router.pathname === '/restricted') {
    return <Component {...pageProps} />;
  }

  // Allow access to other pages only if user has referral or is not authenticated
  if (!walletAuthenticated || hasReferral) {
    return <Component {...pageProps} />;
  }

  // Fallback - should not reach here due to redirect
  return null;
}

export default function MyApp({ Component, pageProps }) {
  return (
    <MiniKitProvider>
      <AppWrapper Component={Component} pageProps={pageProps} />
    </MiniKitProvider>
  );
}
