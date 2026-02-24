import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Movie Night with Sargam</title>
        <meta name="description" content="A special movie night just for you" />
      </Head>
      <div className="min-h-screen font-sans">
        <Component {...pageProps} />
      </div>
    </>
  )
}
