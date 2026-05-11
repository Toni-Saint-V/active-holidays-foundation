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
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
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
