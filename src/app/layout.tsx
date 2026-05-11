import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import '@/app/globals.css'
import { AutoMotion } from '@/components/AutoMotion'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Active Holiday',
  description: 'Проверка готовности к подаче на шенген',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Active Holiday',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/ah-icon.svg',
    apple: '/ah-icon.svg',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#020712',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={`${inter.variable} min-h-screen ah-grid-bg`}>
        <AutoMotion />
        {children}
      </body>
    </html>
  )
}
