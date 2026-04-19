'use client'
import Sidebar from '../../components/Sidebar'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{minHeight:'100vh',background:'#f8fafc'}}>
      <Sidebar />
      <main style={{padding:'24px 16px'}}>
        {children}
      </main>
    </div>
  )
}
