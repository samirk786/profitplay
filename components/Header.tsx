'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'

export default function Header() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const activeTab = pathname === '/dashboard' || pathname?.startsWith('/dashboard') ? 'Account' : 'Board'
  const [plan, setPlan] = useState<string | null>(null)
  const [startingScore, setStartingScore] = useState<number | null>(null)

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserProfile()
    }
  }, [session])

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setPlan(data.plan)
        setStartingScore(data.startingScore)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const formatPlan = (plan: string | null) => {
    if (!plan) return 'None'
    return plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase()
  }

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span style={{ color: 'white', fontSize: '0.875rem' }}>
              Current Plan: {formatPlan(plan)}
            </span>
            {startingScore !== null && (
              <span style={{ color: 'white', fontSize: '0.875rem' }}>
                Starting Score: ${startingScore.toLocaleString()}
              </span>
            )}
          </div>
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
