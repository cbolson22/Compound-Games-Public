import type { Metadata } from 'next'
import { DM_Serif_Display, DM_Mono, Outfit } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const dmSerif = DM_Serif_Display({
  weight: '400',
  variable: '--font-dm-serif',
  subsets: ['latin'],
})

const dmMono = DM_Mono({
  weight: ['400', '500'],
  variable: '--font-dm-mono',
  subsets: ['latin'],
})

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Compound Games',
  description: 'Daily puzzle games — Numeris, Lumis, Verba, Aquarum, Compondus, Loopa',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${dmSerif.variable} ${dmMono.variable} ${outfit.variable}`}
    >
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
