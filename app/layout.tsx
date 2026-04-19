import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gestionale SaaS | Gestionale',
  description: 'Pannello di controllo per il gestionale aziendale SaaS, con dashboard, clienti, fatture e magazzino.',
  openGraph: {
    title: 'Gestionale SaaS | Gestionale',
    description: 'Pannello di controllo per il gestionale aziendale SaaS, con dashboard, clienti, fatture e magazzino.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-slate-100 text-slate-950">
        {children}
      </body>
    </html>
  )
}
