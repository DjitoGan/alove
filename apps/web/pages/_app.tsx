import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>ALOVE - Marketplace de Pièces Auto</title>
        <meta name="description" content="ALOVE - Marketplace de pièces auto d'occasion en Afrique de l'Ouest" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#0070f3" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
