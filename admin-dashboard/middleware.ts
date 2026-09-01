import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('sb-access-token')?.value || request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  // Δημόσια routes που δεν απαιτούν login
  const isPublicRoute = pathname === '/login' || pathname.startsWith('/_next') || pathname.startsWith('/api');

  // Αν ο χρήστης ΔΕΝ είναι συνδεδεμένος και προσπαθεί να μπει σε προστατευμένο route
  if (!token && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Αν ο χρήστης ΕΙΝΑΙ συνδεδεμένος και προσπαθεί να μπει στο /login
  if (token && pathname === '/login') {
    const dashboardUrl = new URL('/', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};