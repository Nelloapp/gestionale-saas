'use client'
import Link from 'next/link'
import { ShieldX, Lock } from 'lucide-react'

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-10 shadow-[0_24px_80px_rgba(15,23,42,0.08)] text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldX className="w-10 h-10 text-red-500" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Registrazione non disponibile</h1>
        <p className="text-slate-500 text-sm mb-6">
          La registrazione pubblica è disabilitata. Solo l'amministratore può creare nuovi account.
          Contatta il tuo amministratore per ottenere l'accesso.
        </p>
        <div className="bg-slate-50 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <Lock className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <p className="text-xs text-slate-500 text-left">
            Il sistema è ad accesso controllato. Gli account vengono creati e approvati esclusivamente dall'amministratore.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Vai al Login
        </Link>
      </div>
    </div>
  )
}
