import MiniKitProvider from '../components/MiniKitProvider';
import '../styles/globals.css';

export default function MyApp({ Component, pageProps }) {
  return (
    <MiniKitProvider>
      <Component {...pageProps} />
    </MiniKitProvider>
  );
}
