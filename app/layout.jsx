import './globals.css'
import { Archivo, Martian_Mono } from 'next/font/google'
import ServiceWorkerRegister from './sw-register'

// Self-hosted at build time (served from this app's own origin) so the design
// holds up offline — no runtime dependency on the Google Fonts CDN.
const archivo = Archivo({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-archivo',
  display: 'swap',
})

const martianMono = Martian_Mono({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-martian',
  display: 'swap',
})

export const metadata = {
  title: 'LHIBC Raffles',
  description: 'Live raffle draw — reveal each winning ticket one digit at a time.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Raffles',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#15110f',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${archivo.variable} ${martianMono.variable}`}>
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
