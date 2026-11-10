import { Outlet } from 'react-router-dom'
import logo from '@/assets/coralswift-logo.png'

export function AuthLayout() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm rounded-lg border border-line bg-white p-6 shadow-sm">
        <img src={logo} alt="CoralSwift Technologies" className="mx-auto mb-6 h-20 w-auto" />
        <Outlet />
      </div>
    </main>
  )
}
