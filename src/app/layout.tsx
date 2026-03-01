import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ImageCrop — Free Online Image Cropping Tool',
  description: 'Crop images locally in your browser. Supports presets for social media, print, and more. Privacy-first — your images never leave your device.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body className={`${geist.className} antialiased`}>{children}</body>
    </html>
  )
}
