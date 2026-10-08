import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. User ki cookies se 'auth_token' get karein
  const token = request.cookies.get('auth_token')?.value;

  // 2. Check karein user kis page par hai
  const isAuthPage = request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register';

  // Agar token nahi hai, aur user kisi private page (jaise '/') par hai, toh /login par bhej dein
  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Agar token hai, aur user /login ya /register par wapis jane ki koshish kare, toh / (home) par bhej dein
  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Sab theek hai toh user ko aage jane dein
  return NextResponse.next();
}

// Ye config batati hai ke middleware kin routes par chalna chahiye
export const config = {
  // Hum isko images, static files, aur api routes ke ilawa sab par chala rahe hain
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};