'use client'
import { AuthProvider } from '../../lib/useAuth'
import Sidebar from '../../components/Sidebar'
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div style={{minHeight:'100vh',background:'#f8fafc'}}>
        <Sidebar />
        <main style={{padding:'24px 16px'}}>
          {children}
        </main>
      </div>
    </AuthProvider>
  )
}
