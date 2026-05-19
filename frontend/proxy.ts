import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/']

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  const isPublic = PUBLIC_ROUTES.includes(pathname)
  const token = req.cookies.get('mala_session')?.value

  if (isPublic && token && pathname !== '/dashboard') {
    const url = req.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (!isPublic && !token) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.search = `?next=${encodeURIComponent(pathname + search)}`
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$|.*\\.svg$|.*\\.ico$).*)'],
}
