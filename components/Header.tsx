'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'

export default function Header() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const activeTab = pathname === '/dashboard' || pathname?.startsWith('/dashboard') ? 'Account' : 'Board'

  const handleAccountClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!session) {
      e.preventDefault()
      window.location.href = '/auth/signin'
    }
  }

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
            href={session ? "/dashboard" : "/auth/signin"}
            onClick={handleAccountClick}
            className={`nav-tab-btn ${activeTab === 'Account' ? 'nav-tab-btn-active' : ''}`}
          >
            Account
          </Link>
        </div>
      </div>
      {session ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'white', fontSize: '0.875rem' }}>
            {session.user?.email}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="nav-account-btn"
          >
            Log Out
          </button>
        </div>
      ) : (
        <Link href="/auth/signin" className="nav-account-btn">
          Log In
        </Link>
      )}
    </nav>
  )
}
