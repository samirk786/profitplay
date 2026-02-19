import Constants from 'expo-constants'

const fallbackBaseUrl = 'http://localhost:3000'

const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  extra?.apiBaseUrl ||
  fallbackBaseUrl

export type ApiRequestOptions = RequestInit & {
  query?: Record<string, string | number | boolean | undefined>
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const url = new URL(path, API_BASE_URL)
  if (options.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    })
  }

  const response = await fetch(url.toString(), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || `Request failed (${response.status})`)
  }

  return response.json() as Promise<T>
}
