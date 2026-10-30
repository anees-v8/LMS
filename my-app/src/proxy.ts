import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const corsOrigins = (process.env.CORS_ORIGINS || '*').split(',').map((s) => s.trim());
const isWildcard = corsOrigins.includes('*');

const corsHeaders = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = request.headers.get('host') || '';
  const pathname = url.pathname;

  // 1. Strict Domain Separation for Production (campusweb.co.in)
  const isCampusWeb = host.includes('campusweb.co.in');

  if (isCampusWeb) {
    const isDashboardDomain = host.startsWith('dashboard.') || host.startsWith('app.');
    const isMainDomain = !isDashboardDomain; // campusweb.co.in or www.campusweb.co.in

    // App & Portal routes that strictly belong to dashboard.campusweb.co.in
    const isAppRoute =
      pathname === '/dashboard' || pathname.startsWith('/dashboard/') ||
      pathname === '/students' || pathname.startsWith('/students/') ||
      pathname === '/teachers' || pathname.startsWith('/teachers/') ||
      pathname === '/batches' || pathname.startsWith('/batches/') ||
      pathname === '/fees' || pathname.startsWith('/fees/') ||
      pathname === '/reports' || pathname.startsWith('/reports/') ||
      pathname === '/settings' || pathname.startsWith('/settings/') ||
      pathname === '/subscription' || pathname.startsWith('/subscription/') ||
      pathname === '/forgot-password' || pathname.startsWith('/forgot-password/') ||
      pathname === '/login' || pathname.startsWith('/login/') ||
      pathname === '/student' || pathname.startsWith('/student/') ||
      pathname.startsWith('/receipt/');

    // Marketing & Promotional routes that belong to campusweb.co.in
    const isMarketingRoute =
      pathname === '/pricing' ||
      pathname === '/about' ||
      pathname === '/contact' ||
      pathname === '/demo' ||
      pathname === '/book-demo' ||
      pathname === '/features' ||
      pathname === '/how-it-works' ||
      pathname === '/resources';

    // SCENARIO 1: Request is on dashboard.campusweb.co.in
    if (isDashboardDomain) {
      // Root URL -> Redirect to /dashboard or /login (NEVER show marketing home page)
      if (pathname === '/') {
        const token = request.cookies.get('campus_access_token')?.value;
        url.pathname = token ? '/dashboard' : '/login';
        return NextResponse.redirect(url);
      }

      // If user accesses marketing pages on dashboard domain, send them to promotional site
      if (isMarketingRoute) {
        return NextResponse.redirect(`https://www.campusweb.co.in${pathname}${url.search}`);
      }
    }

    // SCENARIO 2: Request is on campusweb.co.in / www.campusweb.co.in (PROMOTIONAL SITE ONLY)
    if (isMainDomain) {
      // If user tries to access any app/portal route on promotional site, send to dashboard domain!
      if (isAppRoute) {
        return NextResponse.redirect(`https://dashboard.campusweb.co.in${pathname}${url.search}`);
      }
    }
  }

  // 2. CORS Handling for /api/*
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin') ?? '';
    const isAllowedOrigin = isWildcard || corsOrigins.includes(origin);

    if (request.method === 'OPTIONS') {
      const preflightHeaders: Record<string, string> = { ...corsHeaders };
      if (isAllowedOrigin) {
        preflightHeaders['Access-Control-Allow-Origin'] = isWildcard ? '*' : origin;
        if (!isWildcard) preflightHeaders['Access-Control-Allow-Credentials'] = 'true';
      }
      return new NextResponse(null, { status: 204, headers: preflightHeaders });
    }

    const response = NextResponse.next();
    if (isAllowedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', isWildcard ? '*' : origin);
      if (!isWildcard) response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value));
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, site.webmanifest, sitemap.xml, robots.txt
     * - images & assets (*.png, *.jpg, *.svg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|site.webmanifest|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
