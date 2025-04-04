import { MiniKitProvider } from '../contexts/MiniKitContext';
import '../styles/globals.css';

export default function MyApp({ Component, pageProps }) {
  return (
    <MiniKitProvider>
      <Component {...pageProps} />
    </MiniKitProvider>
  );
}
