'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function SignUp() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    ageVerified: false,
    termsAccepted: false
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setIsLoading(true)

    // Basic validation
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    
    if (!formData.ageVerified) {
      newErrors.ageVerified = 'You must verify your age to continue'
    }
    
    if (!formData.termsAccepted) {
      newErrors.termsAccepted = 'You must accept the terms and conditions'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setIsLoading(false)
      return
    }

    try {
      // Create the user account
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          ageVerified: formData.ageVerified,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Signup API error:', data)
        setErrors({ general: data.error || 'Failed to create account. Please try again.' })
        setIsLoading(false)
        return
      }

      // Automatically sign in the user after successful signup
      const signInResult = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (signInResult?.error) {
        setErrors({ general: 'Account created but failed to sign in. Please sign in manually.' })
        setIsLoading(false)
        router.push('/auth/signin')
      } else if (signInResult?.ok) {
        // Redirect to dashboard
        router.push('/dashboard')
      }
    } catch (error: any) {
      console.error('Signup error:', error)
      const errorMessage = error?.message || 'An error occurred. Please try again.'
      setErrors({ general: errorMessage })
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  return (
    <div className="App">
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        padding: '2rem'
      }}>
        <div style={{ 
          width: '100%', 
          maxWidth: '420px',
          margin: '0 auto'
        }}>
          <Link href="/" style={{ 
            display: 'flex', 
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '2rem',
            textDecoration: 'none'
          }}>
            <Image 
              src="/profitplaylogo.png" 
              alt="ProfitPlay Logo" 
              width={32}
              height={32}
            />
            <h1 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 600, 
              color: 'white',
              margin: 0
            }}>ProfitPlay</h1>
          </Link>
          
          <div style={{
            backgroundColor: '#1E1E1E',
            border: '1px solid #FFFFFF',
            borderRadius: '16px',
            padding: '2rem'
          }}>
            <h2 style={{ 
              marginTop: 0,
              marginBottom: '0.5rem',
              textAlign: 'center',
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'white'
            }}>
              Create your account
            </h2>
            <p style={{ 
              textAlign: 'center', 
              fontSize: '0.875rem', 
              color: '#cccccc',
              marginBottom: '2rem'
            }}>
              Or{' '}
              <Link href="/auth/signin" style={{ 
                color: '#3B82F6',
                textDecoration: 'none',
                fontWeight: 500
              }}>
                sign in to your existing account
              </Link>
            </p>

            {errors.general && (
              <div style={{
                marginBottom: '1.5rem',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #EF4444',
                color: '#EF4444',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem'
              }}>
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label htmlFor="name" style={{ 
                  display: 'block',
                  fontSize: '0.875rem', 
                  fontWeight: 500, 
                  color: 'white',
                  marginBottom: '0.5rem'
                }}>
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: '#121212',
                    border: errors.name ? '1px solid #EF4444' : '1px solid #555',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.875rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#777'}
                  onBlur={(e) => e.target.style.borderColor = errors.name ? '#EF4444' : '#555'}
                />
                {errors.name && (
                  <p style={{ 
                    marginTop: '0.5rem', 
                    fontSize: '0.875rem', 
                    color: '#EF4444',
                    margin: 0
                  }}>
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="email" style={{ 
                  display: 'block',
                  fontSize: '0.875rem', 
                  fontWeight: 500, 
                  color: 'white',
                  marginBottom: '0.5rem'
                }}>
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: '#121212',
                    border: errors.email ? '1px solid #EF4444' : '1px solid #555',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.875rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#777'}
                  onBlur={(e) => e.target.style.borderColor = errors.email ? '#EF4444' : '#555'}
                />
                {errors.email && (
                  <p style={{ 
                    marginTop: '0.5rem', 
                    fontSize: '0.875rem', 
                    color: '#EF4444',
                    margin: 0
                  }}>
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="password" style={{ 
                  display: 'block',
                  fontSize: '0.875rem', 
                  fontWeight: 500, 
                  color: 'white',
                  marginBottom: '0.5rem'
                }}>
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: '#121212',
                    border: errors.password ? '1px solid #EF4444' : '1px solid #555',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.875rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#777'}
                  onBlur={(e) => e.target.style.borderColor = errors.password ? '#EF4444' : '#555'}
                />
                {errors.password && (
                  <p style={{ 
                    marginTop: '0.5rem', 
                    fontSize: '0.875rem', 
                    color: '#EF4444',
                    margin: 0
                  }}>
                    {errors.password}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" style={{ 
                  display: 'block',
                  fontSize: '0.875rem', 
                  fontWeight: 500, 
                  color: 'white',
                  marginBottom: '0.5rem'
                }}>
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: '#121212',
                    border: errors.confirmPassword ? '1px solid #EF4444' : '1px solid #555',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.875rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#777'}
                  onBlur={(e) => e.target.style.borderColor = errors.confirmPassword ? '#EF4444' : '#555'}
                />
                {errors.confirmPassword && (
                  <p style={{ 
                    marginTop: '0.5rem', 
                    fontSize: '0.875rem', 
                    color: '#EF4444',
                    margin: 0
                  }}>
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Age Verification */}
              <div style={{
                backgroundColor: 'rgba(234, 179, 8, 0.1)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <div style={{ flexShrink: 0, marginTop: '0.125rem' }}>
                    <svg style={{ width: '1.25rem', height: '1.25rem', color: '#EAB308' }} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: 500, 
                      color: '#EAB308',
                      marginTop: 0,
                      marginBottom: '0.5rem'
                    }}>
                      Age Verification Required
                    </h3>
                    <p style={{ 
                      fontSize: '0.875rem', 
                      color: '#cccccc',
                      marginTop: 0,
                      marginBottom: '0.75rem'
                    }}>
                      You must be 18 or older to use this platform.
                    </p>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        name="ageVerified"
                        checked={formData.ageVerified}
                        onChange={handleChange}
                        style={{
                          width: '1rem',
                          height: '1rem',
                          marginRight: '0.5rem',
                          cursor: 'pointer'
                        }}
                      />
                      <span style={{ fontSize: '0.875rem', color: '#cccccc' }}>
                        I confirm that I am 18 years of age or older
                      </span>
                    </label>
                    {errors.ageVerified && (
                      <p style={{ 
                        marginTop: '0.5rem', 
                        fontSize: '0.875rem', 
                        color: '#EF4444',
                        margin: 0
                      }}>
                        {errors.ageVerified}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div>
                <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="termsAccepted"
                    checked={formData.termsAccepted}
                    onChange={handleChange}
                    style={{
                      width: '1rem',
                      height: '1rem',
                      marginRight: '0.5rem',
                      marginTop: '0.125rem',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  />
                  <span style={{ fontSize: '0.875rem', color: '#cccccc' }}>
                    I agree to the{' '}
                    <Link href="/terms" style={{ color: '#3B82F6', textDecoration: 'none' }}>
                      Terms of Service
                    </Link>
                    {' '}and{' '}
                    <Link href="/privacy" style={{ color: '#3B82F6', textDecoration: 'none' }}>
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                {errors.termsAccepted && (
                  <p style={{ 
                    marginTop: '0.5rem', 
                    fontSize: '0.875rem', 
                    color: '#EF4444',
                    margin: 0
                  }}>
                    {errors.termsAccepted}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: isLoading ? '#4a4a4a' : 'white',
                  color: isLoading ? 'rgba(255, 255, 255, 0.5)' : '#121212',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s ease',
                  marginTop: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) {
                    e.currentTarget.style.backgroundColor = 'white'
                  }
                }}
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
