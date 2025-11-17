import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Ensure NEXTAUTH_URL is always set to prevent Invalid URL errors during build
if (!process.env.NEXTAUTH_URL) {
  // In production, use the actual domain
  if (process.env.VERCEL) {
    process.env.NEXTAUTH_URL = 'https://profitplay.co'
  } else if (process.env.VERCEL_URL) {
    process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`
  } else {
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
  }
}

console.log('🔧 NEXTAUTH_URL:', process.env.NEXTAUTH_URL)
console.log('🔧 NODE_ENV:', process.env.NODE_ENV)

// Check for required environment variables
if (!process.env.NEXTAUTH_SECRET) {
  console.warn('⚠️ NEXTAUTH_SECRET is not set! This may cause authentication issues.')
}

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: process.env.NODE_ENV === 'production',
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log('⚠️ Missing credentials')
            return null
          }

          console.log(`🔍 Attempting to authenticate: ${credentials.email}`)
          
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          })

          if (!user) {
            console.log(`❌ User not found: ${credentials.email}`)
            return null
          }

          if (!user.password) {
            console.log(`❌ User has no password: ${credentials.email}`)
            return null
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

          if (!isPasswordValid) {
            console.log(`❌ Invalid password for: ${credentials.email}`)
            return null
          }

          console.log(`✅ Authentication successful for: ${credentials.email}`)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        } catch (error) {
          console.error('❌ Auth error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.sub = user.id
        token.role = (user as any).role
        console.log('🔑 JWT callback - Token set:', { id: token.id, role: token.role })
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string || token.sub || ''
        session.user.role = (token.role as string) || ''
        console.log('📋 Session callback - Session set:', { id: session.user.id, role: session.user.role })
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Ensure we redirect to the correct base URL
      const redirectUrl = url.startsWith('/') ? `${baseUrl}${url}` : url
      console.log('🔄 Redirect callback:', { url, baseUrl, redirectUrl })
      return redirectUrl
    }
  },
  pages: {
    signIn: '/auth/signin'
  }
})

export { handler as GET, handler as POST }