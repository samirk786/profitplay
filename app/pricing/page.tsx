'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'

const plans = [
  {
    name: 'Starter',
    price: 29,
    description: 'Perfect for beginners',
    features: [
      '8% profit target',
      '5% max daily loss',
      '15% max drawdown',
      '2% max stake per bet',
      'Basic markets (NBA, NFL, MLB)',
      'Email support'
    ],
    popular: false
  },
  {
    name: 'Standard',
    price: 59,
    description: 'Most popular choice',
    features: [
      '10% profit target',
      '5% max daily loss',
      '15% max drawdown',
      '3% max stake per bet',
      'All major sports',
      'Priority support',
      'Advanced analytics'
    ],
    popular: true
  },
  {
    name: 'Pro',
    price: 99,
    description: 'For serious evaluators',
    features: [
      '12% profit target',
      '5% max daily loss',
      '15% max drawdown',
      '5% max stake per bet',
      'All sports + live markets',
      'Dedicated support',
      'Custom analytics',
      'Early access to new features'
    ],
    popular: false
  }
]

export default function Pricing() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)

  useEffect(() => {
    if (session) {
      fetchCurrentPlan()
    } else {
      setCurrentPlan(null)
    }
  }, [session])

  const fetchCurrentPlan = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setCurrentPlan(data.plan || null)
      }
    } catch (error) {
      console.error('Error fetching current plan:', error)
    }
  }

  const planRank: Record<string, number> = {
    STARTER: 1,
    STANDARD: 2,
    PRO: 3
  }

  const handlePlanSelection = async (planName: string) => {
    if (!session) {
      // Not logged in - redirect to signup
      router.push(`/auth/signup?plan=${planName.toLowerCase()}`)
      return
    }

    // Logged in - create subscription
    setLoading(planName)
    try {
      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          plan: planName.toUpperCase(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Failed to create subscription. Please try again.')
        setLoading(null)
        return
      }

      // Success - redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Error creating subscription:', error)
      alert('An error occurred. Please try again.')
      setLoading(null)
    }
  }

  return (
    <div className="App">
      <Header />

      <main style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '4rem 2rem',
        minHeight: 'calc(100vh - 80px)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h1 style={{ 
            fontSize: '3rem', 
            fontWeight: 700, 
            color: 'white', 
            marginBottom: '1rem' 
          }}>
            Choose Your Evaluation Plan
          </h1>
          <p style={{ 
            fontSize: '1.25rem', 
            color: '#cccccc', 
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Start your journey to becoming a disciplined, profitable evaluator. 
            All plans include risk-free simulation with real market data.
          </p>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '2rem',
          marginBottom: '5rem'
        }}>
          {plans.map((plan) => {
            const planKey = plan.name.toUpperCase()
            const currentRank = currentPlan ? planRank[currentPlan] : null
            const thisRank = planRank[planKey]
            const isSelected = currentRank !== null && currentRank === thisRank
            const isUpgrade = currentRank !== null && thisRank > currentRank
            const isLower = currentRank !== null && thisRank < currentRank

            const buttonLabel = isSelected ? 'Selected' : isUpgrade ? 'Upgrade' : 'Get Started'
            const isDisabled = loading === plan.name || isSelected || isLower

            return (
            <div
              key={plan.name}
              style={{
                position: 'relative',
                backgroundColor: '#1E1E1E',
                border: plan.popular ? '2px solid #3B82F6' : '1px solid #FFFFFF',
                borderRadius: '24px',
                padding: '2rem',
                transform: plan.popular ? 'scale(1.05)' : 'scale(1)',
                transition: 'transform 0.2s ease'
              }}
            >
              {plan.popular && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)'
                }}>
                  <span style={{
                    backgroundColor: '#3B82F6',
                    color: 'white',
                    padding: '0.5rem 1.5rem',
                    borderRadius: '20px',
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}>
                    Most Popular
                  </span>
                </div>
              )}
              
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h3 style={{ 
                  fontSize: '1.75rem', 
                  fontWeight: 700, 
                  color: 'white', 
                  marginBottom: '0.5rem' 
                }}>
                  {plan.name}
                </h3>
                <p style={{ 
                  color: '#cccccc', 
                  marginBottom: '1.5rem',
                  fontSize: '1rem'
                }}>
                  {plan.description}
                </p>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'baseline', 
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}>
                  <span style={{ 
                    fontSize: '3.5rem', 
                    fontWeight: 700, 
                    color: 'white' 
                  }}>
                    ${plan.price}
                  </span>
                  <span style={{ color: '#888888', fontSize: '1.125rem' }}>
                    /month
                  </span>
                </div>
              </div>

              <ul style={{ 
                listStyle: 'none', 
                padding: 0, 
                margin: '0 0 2rem 0',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                {plan.features.map((feature, index) => (
                  <li key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <svg 
                      style={{ 
                        width: '20px', 
                        height: '20px', 
                        color: '#22C55E', 
                        flexShrink: 0,
                        marginTop: '2px'
                      }} 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span style={{ color: '#cccccc', fontSize: '0.9375rem', lineHeight: '1.5' }}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {session ? (
                <button
                  onClick={() => handlePlanSelection(plan.name)}
                  disabled={isDisabled}
                  className={`pricing-link-button ${plan.popular ? 'pricing-link-button-popular' : 'pricing-link-button-secondary'}`}
                  style={{
                    width: '100%',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.5 : 1,
                    backgroundColor: isSelected ? '#2A2A2A' : undefined,
                    color: isSelected ? '#888888' : undefined
                  }}
                >
                  {loading === plan.name ? 'Processing...' : buttonLabel}
                </button>
              ) : (
                <Link
                  href={`/auth/signup?plan=${plan.name.toLowerCase()}`}
                  className={`pricing-link-button ${plan.popular ? 'pricing-link-button-popular' : 'pricing-link-button-secondary'}`}
                >
                  Get Started
                </Link>
              )}
            </div>
          )})}
        </div>

        {/* FAQ Section */}
        <div style={{ marginTop: '5rem' }}>
          <h2 style={{ 
            fontSize: '2rem', 
            fontWeight: 700, 
            textAlign: 'center', 
            color: 'white', 
            marginBottom: '3rem' 
          }}>
            Frequently Asked Questions
          </h2>
          <div style={{ 
            maxWidth: '800px', 
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem'
          }}>
            <div>
              <h3 style={{ 
                fontSize: '1.125rem', 
                fontWeight: 600, 
                color: 'white', 
                marginBottom: '0.75rem' 
              }}>
                What is ProfitPlay?
              </h3>
              <p style={{ color: '#cccccc', lineHeight: '1.6' }}>
                ProfitPlay is a simulation-based evaluation platform that helps you develop 
                disciplined performance skills using real market data without financial risk.
              </p>
            </div>
            <div>
              <h3 style={{ 
                fontSize: '1.125rem', 
                fontWeight: 600, 
                color: 'white', 
                marginBottom: '0.75rem' 
              }}>
                Is this real money wagering?
              </h3>
              <p style={{ color: '#cccccc', lineHeight: '1.6' }}>
                No, this is purely a simulation platform. No real money is wagered by users. 
                We use real market data to create realistic evaluation scenarios.
              </p>
            </div>
            <div>
              <h3 style={{ 
                fontSize: '1.125rem', 
                fontWeight: 600, 
                color: 'white', 
                marginBottom: '0.75rem' 
              }}>
                What happens after I complete a run?
              </h3>
              <p style={{ color: '#cccccc', lineHeight: '1.6' }}>
                Upon successful completion of your evaluation, you'll be eligible for our 
                funded program (coming soon) where you can manage real capital based on 
                your proven performance.
              </p>
            </div>
            <div>
              <h3 style={{ 
                fontSize: '1.125rem', 
                fontWeight: 600, 
                color: 'white', 
                marginBottom: '0.75rem' 
              }}>
                Can I cancel my subscription anytime?
              </h3>
              <p style={{ color: '#cccccc', lineHeight: '1.6' }}>
                Yes, you can cancel your subscription at any time. Your evaluation progress 
                will be saved and you can resume when you're ready.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
