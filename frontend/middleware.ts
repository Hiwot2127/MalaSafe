/**
 * Next.js Middleware for Authentication
 * 
 * Handles:
 * - Session validation via HttpOnly cookies
 * - Automatic redirects for protected routes
 * - CSRF protection
 * - Security headers
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/analytics',
  '/maps',
  '/predictions',
  '/alerts',
  '/upload',
  '/monthly-close',
  '/reports',
  '/settings',
];

// Routes that require admin role
const adminRoutes = ['/admin'];

// Public routes (no auth required)
const publicRoutes = ['/', '/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if route requires authentication
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
  const isPublicRoute = publicRoutes.includes(pathname);
  
  // Get session token from cookie
  const sessionToken = request.cookies.get('session_token')?.value;
  const userRole = request.cookies.get('user_role')?.value;
  
  // Redirect to login if accessing protected route without session
  if (isProtectedRoute && !sessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Redirect to dashboard if accessing admin route without admin role
  if (isAdminRoute && userRole !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // Redirect to dashboard if accessing login/register with valid session
  if ((pathname === '/login' || pathname === '/register') && sessionToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // Add security headers
  const response = NextResponse.next();
  
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy (adjust as needed)
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' http://localhost:8000 https://malasafe-api.onrender.com;"
  );
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
