import { withAuth } from 'next-auth/middleware'

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Check if user is authenticated
        if (!token) {
          console.log('❌ Middleware: No token found')
          return false
        }

        console.log('✅ Middleware: Token found', { 
          hasRole: !!token.role, 
          role: token.role,
          path: req.nextUrl.pathname 
        })

        // Check admin routes
        if (req.nextUrl.pathname.startsWith('/admin')) {
          const isAdmin = token.role === 'ADMIN' && token.email === 'admin@profitplay.com'
          console.log('🔐 Admin route check:', isAdmin)
          return isAdmin
        }

        // Check protected routes
        if (req.nextUrl.pathname.startsWith('/dashboard') || 
            req.nextUrl.pathname.startsWith('/markets')) {
          const hasAccess = token.role === 'MEMBER' || token.role === 'ADMIN'
          console.log('🔐 Protected route check:', hasAccess, 'role:', token.role)
          return hasAccess
        }

        return true
      },
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/markets/:path*',
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/bets/:path*'
    // Note: /api/users is not in the matcher - POST (signup) is public, GET requires auth (handled in route)
  ]
}
