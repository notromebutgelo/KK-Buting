import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SUPERADMIN_ONLY_ROUTES = [
  '/merchants',
  '/rewards',
  '/points-transactions',
  '/reports',
  '/digital-ids',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/login')) {
    return NextResponse.next()
  }

  const token = request.cookies.get('admin-token')?.value

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = request.cookies.get('admin-role')?.value
  const isSuperadminOnlyRoute = SUPERADMIN_ONLY_ROUTES.some((route) =>
    pathname === route || pathname.startsWith(route + '/')
  )

  if (isSuperadminOnlyRoute && role !== 'superadmin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|.*\\..*).*)'],
}
