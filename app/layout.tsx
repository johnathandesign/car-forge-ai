import type { Metadata, Viewport } from 'next'
import { Inter, Heebo } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  variable: '--font-heebo',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CarForge AI — סטודיו תלת־ממדי חכם לעיצוב רכבים',
  description:
    'CarForge AI הוא סטודיו דיגיטלי להתאמה אישית של רכבים, עם תצוגה תלת־ממדית, שליטה מדויקת וחוויית מוסך מקצועית.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0a0a0b',
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="he" dir="rtl" className={`dark ${inter.variable} ${heebo.variable}`}>
      <body className="bg-background text-foreground antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
