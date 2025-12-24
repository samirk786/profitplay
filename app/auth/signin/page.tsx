'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function SignIn() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setIsLoading(true)

    // Basic validation
    const newErrors: Record<string, string> = {}
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setIsLoading(false)
      return
    }

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        setErrors({ general: 'Invalid email or password' })
        setIsLoading(false)
      } else if (result?.ok) {
        setTimeout(async () => {
          try {
            const session = await getSession()
            if (session) {
              window.location.href = '/dashboard'
            } else {
              setErrors({ general: 'Session not established. Please try again.' })
              setIsLoading(false)
            }
          } catch (error) {
            console.error('Error getting session:', error)
            window.location.href = '/dashboard'
          }
        }, 1000)
      } else {
        setErrors({ general: 'Unexpected response. Please try again.' })
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Sign in error:', error)
      setErrors({ general: 'An error occurred. Please try again.' })
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
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
              Sign in to your account
            </h2>
            <p style={{ 
              textAlign: 'center', 
              fontSize: '0.875rem', 
              color: '#cccccc',
              marginBottom: '2rem'
            }}>
              Or{' '}
              <Link href="/auth/signup" style={{ 
                color: '#3B82F6',
                textDecoration: 'none',
                fontWeight: 500
              }}>
                create a new account
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
                  autoComplete="current-password"
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
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
