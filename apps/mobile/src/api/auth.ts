import { API_BASE_URL, apiRequest } from './client'

export type SignInPayload = {
  email: string
  password: string
}

export type SignUpPayload = {
  name: string
  email: string
  password: string
  ageVerified: boolean
}

export async function signUp(payload: SignUpPayload) {
  return apiRequest<{ user: { id: string; name: string; email: string } }>(
    '/api/users',
    {
      method: 'POST',
      body: JSON.stringify(payload)
    }
  )
}

export async function signIn(payload: SignInPayload) {
  const body = new URLSearchParams({
    email: payload.email,
    password: payload.password,
    redirect: 'false',
    json: 'true'
  })

  const response = await fetch(`${API_BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || 'Sign in failed')
  }

  try {
    return await response.json()
  } catch {
    return { ok: true }
  }
}
