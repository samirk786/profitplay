import type { Metadata } from 'next'
import './globals.css'
import AuthSessionProvider from '@/components/SessionProvider'

export const metadata: Metadata = {
  title: 'ProfitPlay - Sports Evaluation Platform',
  description: 'A skill-based evaluation platform for sports performance analysis',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthSessionProvider>
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  )
}
