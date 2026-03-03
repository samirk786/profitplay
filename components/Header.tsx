'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'

export default function Header() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const activeTab = pathname === '/pricing'
    ? 'Plans'
    : pathname === '/dashboard' || pathname?.startsWith('/dashboard')
      ? 'Account'
      : 'Board'
  const [plan, setPlan] = useState<string | null | undefined>(undefined)
  const [startingScore, setStartingScore] = useState<number | null | undefined>(undefined)
  const [profileLoading, setProfileLoading] = useState(false)
  const [adminMenuOpen, setAdminMenuOpen] = useState(false)
  const adminMenuRef = useRef<HTMLDivElement>(null)
  const isAdmin = session?.user?.role === 'ADMIN'

  // Close admin menu on click outside or Escape
  useEffect(() => {
    if (!adminMenuOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target as Node)) {
        setAdminMenuOpen(false)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAdminMenuOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [adminMenuOpen])

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      fetchUserProfile()
    } else if (status === 'unauthenticated') {
      setPlan(null)
      setStartingScore(null)
    }
  }, [session, status])

  const fetchUserProfile = async () => {
    setProfileLoading(true)
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
    } finally {
      setProfileLoading(false)
    }
  }

  const formatPlan = (plan: string | null) => {
    if (status === 'loading' || profileLoading || plan === undefined) return 'Loading...'
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
    <>
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
            href="/pricing"
            className={`nav-tab-btn ${activeTab === 'Plans' ? 'nav-tab-btn-active' : ''}`}
          >
            Plans
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
          </div>
          <span style={{ color: 'white', fontSize: '0.875rem' }}>
            {session.user?.email}
          </span>
          {isAdmin && (
            <div ref={adminMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                title="Admin Panel"
                style={{
                  background: adminMenuOpen ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'white',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  transition: 'background 0.15s'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
                onMouseLeave={(e) => {
                  if (!adminMenuOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Admin
              </button>
              {adminMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  background: '#1a1a2e',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                  padding: '8px',
                  minWidth: '220px',
                  zIndex: 1000,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                }}>
                  <Link
                    href="/admin"
                    onClick={() => setAdminMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      color: 'white',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                    </svg>
                    Dashboard
                  </Link>
                  <Link
                    href="/admin/games"
                    onClick={() => setAdminMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      color: 'white',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
                    </svg>
                    Manage Games
                  </Link>
                  <Link
                    href="/admin/settlements"
                    onClick={() => setAdminMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      color: 'white',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    Manage Settlements
                  </Link>
                </div>
              )}
            </div>
          )}
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
    {session && typeof startingScore === 'number' && (
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        padding: '0.75rem 2rem 0',
        fontSize: '1rem',
        fontWeight: 700,
        color: 'white'
      }}>
        Current Score: ${startingScore.toLocaleString()}
      </div>
    )}
    </>
  )
}
