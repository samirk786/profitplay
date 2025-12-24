'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'

interface ChallengeAccount {
  id: string
  startBalance: number
  equity: number
  highWaterMark: number
  state: string
  ruleset: {
    name: string
    profitTargetPct: number
    maxDailyLossPct: number
    maxDrawdownPct: number
    maxStakePct: number
  }
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [challengeAccount, setChallengeAccount] = useState<ChallengeAccount | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (status === 'authenticated' && session?.user?.id) {
      fetchChallengeAccount()
    }
  }, [status, session, router])

  const fetchChallengeAccount = async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)
      const response = await fetch(`/api/challenges?state=ACTIVE`, {
        credentials: 'include' // Include cookies for authentication
      })
      
      if (!response.ok) {
        console.error('Failed to fetch challenge account:', response.status, response.statusText)
        setChallengeAccount(null)
        return
      }

      const data = await response.json()
      console.log('Challenge account data:', data) // Debug log

      if (data.challenges && data.challenges.length > 0) {
        const activeChallenge = data.challenges[0]
        setChallengeAccount({
          id: activeChallenge.id,
          startBalance: activeChallenge.startBalance,
          equity: activeChallenge.equity,
          highWaterMark: activeChallenge.highWaterMark,
          state: activeChallenge.state,
          ruleset: {
            name: activeChallenge.ruleset.name,
            profitTargetPct: activeChallenge.ruleset.profitTargetPct,
            maxDailyLossPct: activeChallenge.ruleset.maxDailyLossPct,
            maxDrawdownPct: activeChallenge.ruleset.maxDrawdownPct,
            maxStakePct: activeChallenge.ruleset.maxStakePct,
          }
        })
      } else {
        setChallengeAccount(null)
      }
    } catch (error) {
      console.error('Error fetching challenge account:', error)
      setChallengeAccount(null)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="App">
        <Header />
        <div style={{ 
          minHeight: 'calc(100vh - 80px)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              display: 'inline-block',
              width: '48px',
              height: '48px',
              border: '3px solid rgba(255, 255, 255, 0.3)',
              borderTopColor: '#3B82F6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <style jsx>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
            <p style={{ marginTop: '1rem', color: '#cccccc' }}>Loading your dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null // Will redirect
  }

  if (!challengeAccount) {
    return (
      <div className="App">
        <Header />
        <div style={{ 
          minHeight: 'calc(100vh - 80px)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '2rem'
        }}>
          <div style={{ textAlign: 'center', maxWidth: '600px' }}>
            <h1 style={{ 
              fontSize: '2rem', 
              fontWeight: 700, 
              color: 'white', 
              marginBottom: '1rem' 
            }}>
              No Active Challenge
            </h1>
            <p style={{ color: '#cccccc', marginBottom: '2rem', fontSize: '1.125rem' }}>
              You don't have an active challenge account. Subscribe to a plan to get started.
            </p>
            <Link
              href="/pricing"
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                backgroundColor: 'white',
                color: '#121212',
                borderRadius: '8px',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              View Plans
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const profit = challengeAccount.equity - challengeAccount.startBalance
  const profitPct = (profit / challengeAccount.startBalance) * 100
  const profitTarget = challengeAccount.startBalance * (challengeAccount.ruleset.profitTargetPct / 100)
  const progressToTarget = Math.min((profit / profitTarget) * 100, 100)

  return (
    <div className="App">
      <Header />

      <main style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '2rem',
        minHeight: 'calc(100vh - 80px)'
      }}>
        {/* Welcome Section */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 700, 
            color: 'white', 
            marginBottom: '0.5rem' 
          }}>
            Welcome to your Challenge
          </h1>
          <p style={{ color: '#cccccc', fontSize: '1.125rem' }}>
            Track your progress and manage your simulated performance.
          </p>
        </div>

        {/* Stats Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '1.5rem', 
          marginBottom: '2rem' 
        }}>
          <div style={{
            backgroundColor: '#1E1E1E',
            border: '1px solid #FFFFFF',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <h3 style={{ 
              fontSize: '0.875rem', 
              fontWeight: 500, 
              color: '#888888', 
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Current Balance</h3>
            <p style={{ 
              fontSize: '2rem', 
              fontWeight: 700, 
              color: 'white',
              margin: 0
            }}>
              ${challengeAccount.equity.toLocaleString()}
            </p>
          </div>
          
          <div style={{
            backgroundColor: '#1E1E1E',
            border: '1px solid #FFFFFF',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <h3 style={{ 
              fontSize: '0.875rem', 
              fontWeight: 500, 
              color: '#888888', 
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Profit/Loss</h3>
            <p style={{ 
              fontSize: '2rem', 
              fontWeight: 700, 
              color: profit >= 0 ? '#22C55E' : '#EF4444',
              margin: 0
            }}>
              {profit >= 0 ? '+' : ''}${profit.toLocaleString()}
            </p>
          </div>
          
          <div style={{
            backgroundColor: '#1E1E1E',
            border: '1px solid #FFFFFF',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <h3 style={{ 
              fontSize: '0.875rem', 
              fontWeight: 500, 
              color: '#888888', 
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Profit %</h3>
            <p style={{ 
              fontSize: '2rem', 
              fontWeight: 700, 
              color: profitPct >= 0 ? '#22C55E' : '#EF4444',
              margin: 0
            }}>
              {profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}%
            </p>
          </div>
          
          <div style={{
            backgroundColor: '#1E1E1E',
            border: '1px solid #FFFFFF',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <h3 style={{ 
              fontSize: '0.875rem', 
              fontWeight: 500, 
              color: '#888888', 
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>Status</h3>
            <span style={{
              display: 'inline-block',
              padding: '0.5rem 1rem',
              borderRadius: '20px',
              fontSize: '0.875rem',
              fontWeight: 600,
              backgroundColor: challengeAccount.state === 'ACTIVE' ? 'rgba(34, 197, 94, 0.2)' :
                                challengeAccount.state === 'PASSED' ? 'rgba(59, 130, 246, 0.2)' :
                                challengeAccount.state === 'FAILED' ? 'rgba(239, 68, 68, 0.2)' :
                                'rgba(234, 179, 8, 0.2)',
              color: challengeAccount.state === 'ACTIVE' ? '#22C55E' :
                     challengeAccount.state === 'PASSED' ? '#3B82F6' :
                     challengeAccount.state === 'FAILED' ? '#EF4444' :
                     '#EAB308',
              border: `1px solid ${challengeAccount.state === 'ACTIVE' ? '#22C55E' :
                                  challengeAccount.state === 'PASSED' ? '#3B82F6' :
                                  challengeAccount.state === 'FAILED' ? '#EF4444' :
                                  '#EAB308'}`
            }}>
              {challengeAccount.state}
            </span>
          </div>
        </div>

        {/* Progress Section */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
          gap: '2rem', 
          marginBottom: '2rem' 
        }}>
          {/* Progress to Target */}
          <div style={{
            backgroundColor: '#1E1E1E',
            border: '1px solid #FFFFFF',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <h3 style={{ 
              fontSize: '1.125rem', 
              fontWeight: 600, 
              color: 'white', 
              marginBottom: '1rem' 
            }}>
              Progress to Target
            </h3>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                fontSize: '0.875rem', 
                color: '#cccccc', 
                marginBottom: '0.5rem' 
              }}>
                <span>Current: ${profit.toLocaleString()}</span>
                <span>Target: ${profitTarget.toLocaleString()}</span>
              </div>
              <div style={{ 
                width: '100%', 
                backgroundColor: '#333333', 
                borderRadius: '9999px', 
                height: '12px',
                overflow: 'hidden'
              }}>
                <div
                  style={{
                    backgroundColor: '#3B82F6',
                    height: '100%',
                    borderRadius: '9999px',
                    transition: 'width 0.3s ease',
                    width: `${Math.max(0, Math.min(100, progressToTarget))}%`
                  }}
                ></div>
              </div>
              <p style={{ 
                fontSize: '0.875rem', 
                color: '#cccccc', 
                marginTop: '0.5rem',
                margin: 0
              }}>
                {progressToTarget.toFixed(1)}% complete
              </p>
            </div>
          </div>

          {/* Challenge Rules */}
          <div style={{
            backgroundColor: '#1E1E1E',
            border: '1px solid #FFFFFF',
            borderRadius: '16px',
            padding: '1.5rem'
          }}>
            <h3 style={{ 
              fontSize: '1.125rem', 
              fontWeight: 600, 
              color: 'white', 
              marginBottom: '1rem' 
            }}>
              Challenge Rules
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#cccccc' }}>Profit Target:</span>
                <span style={{ fontWeight: 600, color: 'white' }}>{challengeAccount.ruleset.profitTargetPct}%</span>
              </div>
              <div style={{ 
                width: '100%', 
                height: '1px', 
                backgroundColor: '#333333',
                margin: '0.25rem 0'
              }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#cccccc' }}>Max Daily Loss:</span>
                <span style={{ fontWeight: 600, color: 'white' }}>{challengeAccount.ruleset.maxDailyLossPct}%</span>
              </div>
              <div style={{ 
                width: '100%', 
                height: '1px', 
                backgroundColor: '#333333',
                margin: '0.25rem 0'
              }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#cccccc' }}>Max Drawdown:</span>
                <span style={{ fontWeight: 600, color: 'white' }}>{challengeAccount.ruleset.maxDrawdownPct}%</span>
              </div>
              <div style={{ 
                width: '100%', 
                height: '1px', 
                backgroundColor: '#333333',
                margin: '0.25rem 0'
              }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#cccccc' }}>Max Stake per Bet:</span>
                <span style={{ fontWeight: 600, color: 'white' }}>{challengeAccount.ruleset.maxStakePct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{
          backgroundColor: '#1E1E1E',
          border: '1px solid #FFFFFF',
          borderRadius: '16px',
          padding: '1.5rem'
        }}>
          <h3 style={{ 
            fontSize: '1.125rem', 
            fontWeight: 600, 
            color: 'white', 
            marginBottom: '1rem' 
          }}>
            Quick Actions
          </h3>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '1rem' 
          }}>
            <Link
              href="/"
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                backgroundColor: 'white',
                color: '#121212',
                borderRadius: '8px',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'background-color 0.2s ease',
                border: 'none',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              Browse Markets
            </Link>
            <Link
              href="/dashboard/bets"
              style={{
                display: 'inline-block',
                padding: '0.75rem 1.5rem',
                backgroundColor: 'transparent',
                color: 'white',
                borderRadius: '8px',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                border: '1px solid white',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              View My Bets
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
