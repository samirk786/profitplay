'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

export default function Header() {
  const pathname = usePathname()
  const activeTab = pathname === '/dashboard' || pathname?.startsWith('/dashboard') ? 'Account' : 'Board'

  return (
    <nav className="nav-bar">
      <div className="nav-left">
        <Link href="/" className="nav-logo">
          <Image 
            src="/profitplaylogo.png" 
            alt="ProfitPlay Logo" 
            className="nav-logo-img"
            width={32}
            height={32}
          />
          <span>ProfitPlay</span>
        </Link>
        <div className="nav-tabs">
          <Link 
            href="/"
            className={`nav-tab-btn ${activeTab === 'Board' ? 'nav-tab-btn-active' : ''}`}
          >
            Board
          </Link>
          <Link 
            href="/dashboard"
            className={`nav-tab-btn ${activeTab === 'Account' ? 'nav-tab-btn-active' : ''}`}
          >
            Account
          </Link>
        </div>
      </div>
      <Link href="/auth/signin" className="nav-account-btn">
        Log In
      </Link>
    </nav>
  )
}
