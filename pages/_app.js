import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { MiniKitProvider } from '../contexts/MiniKitContext';
import '../styles/globals.css';
import { WagmiConfig, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a new QueryClient instance
const queryClient = new QueryClient();

// Define the World chain with correct settings
const worldChain = {
  id: 4801,   // Chain ID: 0x12C1 (4801 in decimal)
  name: 'World Chain Sepolia',
  network: 'worldchain-sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Sepolia ETH',
    symbol: 'ETH',
  },
  rpcUrls: {
    public: { 
      http: ['https://worldchain-sepolia.g.alchemy.com/public'],
    },
    default: { 
      http: ['https://worldchain-sepolia.g.alchemy.com/public'],
    },
  },
  blockExplorers: {
    default: { 
      name: 'World Chain Explorer', 
      url: 'https://worldchain-sepolia.explorer.alchemy.com'
    },
  },
};

// Create wagmi config with the correct World chain
const config = createConfig({
  chains: [worldChain],
  transports: {
    [worldChain.id]: http(),
  },
});

export default function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleStart = () => setIsLoading(true);
    const handleComplete = () => setIsLoading(false);

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={config}>
        <MiniKitProvider>
          {isLoading ? (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <Component {...pageProps} />
          )}
        </MiniKitProvider>
      </WagmiConfig>
    </QueryClientProvider>
  );
}
