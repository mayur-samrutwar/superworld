import { useEffect } from 'react';
import { MiniKit } from '@worldcoin/minikit-js';

export default function MiniKitProvider({ children }) {
  useEffect(() => {
    // Initialize MiniKit with the app ID
    MiniKit.install('app_b82ac860b09f1c2e8e5c37ca1452bae3');
  }, []);

  return <>{children}</>;
} 