

import { Inter } from 'next/font/google'


import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import SessionWrapper from '@/components/session-provider'
import { ModalProvider } from '@/components/modal-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'PLM Acctg Solutions, Inc.',
  description: 'Accounting System',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
<SessionWrapper>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
   
            <ModalProvider />
            {children}
            <Toaster />

        </body>
      </html>
      </SessionWrapper>
  )
}
