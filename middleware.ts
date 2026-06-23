import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { ROLE_HIERARCHY, PROTECTED_ROUTES } from '@/constants'
import type { UserRole } from '@prisma/client'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    const userRole = token.role as UserRole
    const userLevel = ROLE_HIERARCHY[userRole] ?? 0

    const isAdminOnly = PROTECTED_ROUTES.ADMIN_ONLY.some((r) => pathname.startsWith(r))
    if (isAdminOnly && userLevel < ROLE_HIERARCHY.ADMIN) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    const isSupervisorAndAbove = PROTECTED_ROUTES.SUPERVISOR_AND_ABOVE.some((r) =>
      pathname.startsWith(r)
    )
    if (isSupervisorAndAbove && userLevel < ROLE_HIERARCHY.SUPERVISOR) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized({ token }) {
        return !!token
      },
    },
  }
)

export const config = {
  matcher: ['/dashboard/:path*', '/machines/:path*', '/map/:path*', '/shifts/:path*', '/admin/:path*', '/reports/:path*'],
}
