import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

import { trackError, trackEvent } from '../analytics/client'
import { signIn as signInRequest, signUp as signUpRequest, SignInPayload, SignUpPayload } from '../api/auth'

type AuthUser = {
  id?: string
  name?: string
  email?: string
}

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  signIn: (payload: SignInPayload) => Promise<void>
  signUp: (payload: SignUpPayload) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(false)

  const signIn = useCallback(async (payload: SignInPayload) => {
    setLoading(true)
    try {
      const response = await signInRequest(payload)
      if (response?.user) {
        setUser(response.user)
      } else {
        setUser({ email: payload.email })
      }
      trackEvent({ name: 'auth_sign_in' })
    } catch (error) {
      trackError(error, { flow: 'signIn' })
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const signUp = useCallback(async (payload: SignUpPayload) => {
    setLoading(true)
    try {
      const response = await signUpRequest(payload)
      setUser(response.user)
      trackEvent({ name: 'auth_sign_up' })
    } catch (error) {
      trackError(error, { flow: 'signUp' })
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(() => {
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    signIn,
    signUp,
    signOut
  }), [user, loading, signIn, signUp, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
