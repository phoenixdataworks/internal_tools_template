import { createServerClient } from '@supabase/ssr';
import { NextResponse, NextRequest } from 'next/server';
import type { Database } from '@/types/supabase';
import { INTERNAL_HEADER, verify } from '@/lib/middlewares/apiSecurity';

/**
 * Internal API endpoints that require HMAC signature verification
 */
const HMAC_AUTH_API_PATHS = ['/api/health'];

// Cache the protected paths to avoid recreating the array on every request
// All authenticated app pages and API routes should be protected
const PROTECTED_PATHS = [
  // API routes
  '/api/users',
  '/api/data-sources',
  '/api/analytics',
  '/api/planning',
];

// Paths that belong to the authenticated route group
// These don't include the (authenticated) in the URL as it's just a route group
const AUTHENTICATED_PATHS = ['/dashboard', '/user', '/chat'];

// Public API paths that don't require authentication
const PUBLIC_API_PATHS = [
  // Public API endpoints
  '/api/health',
];

// Marketing and auth pages that should always be public
const PUBLIC_PATHS = [
  // Auth pages
  '/auth',
  '/auth/callback',
  '/auth/confirm',
  '/signin',
  '/signup',
  '/signout',
  '/reset-password',

  // Marketing pages (these don't include the (marketing) in the URL)
  '/',
  '/about',
  '/features',
  '/contact',
  '/privacy',
  '/terms',
];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  try {
    // Check if this is a secret-authenticated API route first
    const isHmacAuthPath = HMAC_AUTH_API_PATHS.some(path => pathname.startsWith(path));

    if (isHmacAuthPath) {
      // Verify HMAC signature or Vercel cron authorization
      try {
        const internalSig = request.headers.get(INTERNAL_HEADER);
        const authHeader = request.headers.get('authorization');
        let verified = false;
        let body = '';

        // Check for internal HMAC signature first
        if (internalSig) {
          body = request.method === 'GET' ? '' : await request.text();
          verified = await verify(process.env.INTERNAL_HMAC_SECRET!, internalSig, body);
        }
        // Fallback to Vercel cron secret authorization
        else if (authHeader && process.env.CRON_SECRET) {
          verified = authHeader === `Bearer ${process.env.CRON_SECRET}`;
        }

        if (!verified) {
          console.log('HMAC auth failed:', {
            path: pathname,
            error: 'Invalid or missing signature/authorization',
            timestamp: new Date().toISOString(),
          });
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('HMAC auth successful:', {
          path: pathname,
          timestamp: new Date().toISOString(),
        });

        // For POST requests with HMAC, we consumed the body, so recreate the request
        if (internalSig && request.method !== 'GET' && body) {
          const newRequest = new NextRequest(request.url, {
            method: request.method,
            headers: request.headers,
            body: body,
          });
          return NextResponse.next({ request: { headers: newRequest.headers } });
        }

        return NextResponse.next({ request: { headers: request.headers } });
      } catch (error) {
        console.error('HMAC verification error:', error);
        return NextResponse.json({ error: 'Auth verification failed' }, { status: 500 });
      }
    }

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll().map(c => ({ name: c.name, value: c.value })),
          setAll: cookiesToSet => {
            cookiesToSet.forEach(({ name, value, options }) => {
              // SSR – request side (no options allowed)
              request.cookies.set(name, value);
              // client side – response is created when needed
            });
          },
        },
      }
    );

    // ── any Supabase cookie/UTF-8 error is thrown before or here ──
    const {
      data: { user },
      error: sessionError,
    } = await supabase.auth.getUser();

    // Check if the path is explicitly public (marketing/auth etc.)
    const isPublicPath = PUBLIC_PATHS.some(
      path => pathname === path || pathname.startsWith(`${path}/`)
    );

    // If it's a public path, skip further auth checks
    if (isPublicPath) {
      return NextResponse.next({
        request: { headers: request.headers },
      });
    }

    // Check if the path belongs to the authenticated route group
    const isAuthenticatedPath = AUTHENTICATED_PATHS.some(
      path => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`)
    );

    // Check if the path needs protection (API or authenticated path)
    const isProtectedPath =
      (PROTECTED_PATHS.some(path => request.nextUrl.pathname.startsWith(path)) &&
        !PUBLIC_API_PATHS.some(path => request.nextUrl.pathname.startsWith(path))) ||
      isAuthenticatedPath;

    // --- SESSION EXPIRED HANDLING ---
    // Only run for protected paths
    if (isProtectedPath && !user) {
      // Check for Supabase refresh token cookie
      const refreshTokenCookie = request.cookies
        .getAll()
        .find(c => c.name.startsWith('sb-refresh-token'));
      let sessionExpired = false;
      if (refreshTokenCookie) {
        // Try to refresh session by calling getUser again (Supabase SSR client should auto-refresh if possible)
        try {
          const {
            data: { user: refreshedUser },
            error: refreshError,
          } = await supabase.auth.getUser();
          if (!refreshedUser) {
            sessionExpired = true;
          }
        } catch (e) {
          sessionExpired = true;
        }
      }
      // If no refresh token, treat as not authenticated (current logic)
      if (sessionExpired || refreshTokenCookie) {
        // Clear all Supabase cookies
        const response = request.nextUrl.pathname.startsWith('/api/')
          ? NextResponse.json({ error: 'Session expired' }, { status: 401 })
          : NextResponse.redirect(
              new URL(
                `/signin?error=${encodeURIComponent('Session expired')}&redirectTo=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`,
                request.url
              )
            );
        request.cookies.getAll().forEach(c => {
          if (c.name.startsWith('sb-')) {
            response.cookies.set(c.name, '', { maxAge: 0, path: '/' });
          }
        });
        return response;
      }
      // If no refresh token and no user, fall through to existing logic (API: 401, page: redirect)
    }

    if (isProtectedPath) {
      // For API routes, return 401 if not authenticated
      if (request.nextUrl.pathname.startsWith('/api/')) {
        if (!user) {
          console.log('API session auth failed:', {
            path: request.nextUrl.pathname,
            hasSession: !!user,
            error: sessionError?.message || 'Auth session missing!',
            timestamp: new Date().toISOString(),
          });
          const apiErrorResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
          return apiErrorResponse;
        }

        // Domain-based access control
        const allowedDomains = process.env.NEXT_PUBLIC_ALLOWED_DOMAINS?.split(',') || [];

        function isAllowedDomain(email: string): boolean {
          if (allowedDomains.length === 0) return true; // Allow all if no domains configured

          const userDomain = email.split('@')[1];
          return allowedDomains.includes(userDomain);
        }

        // For API routes, check authentication and domain access
        if (user.email && !isAllowedDomain(user.email)) {
          console.log('Domain not allowed:', {
            path: pathname,
            user: user.email,
            allowedDomains,
          });
          return NextResponse.redirect(new URL('/auth/domain-not-allowed', request.url));
        }

        console.log('API auth successful:', {
          path: pathname,
          userId: user.id,
          timestamp: new Date().toISOString(),
        });
      } else {
        // For non-API routes, redirect to signin if not authenticated
        console.log('Checking authentication for path:', pathname);
        console.log('User authentication status:', { hasUser: !!user, userId: user?.id });

        if (!user) {
          console.log('🔍 No authenticated user, redirecting to signin');
          const signinUrl = new URL('/signin', request.url);
          signinUrl.searchParams.set(
            'redirectTo',
            request.nextUrl.pathname + request.nextUrl.search
          );
          const pageRedirectResponse = NextResponse.redirect(signinUrl);
          // Clear Supabase cookies on this new response
          request.cookies.getAll().forEach(c => {
            if (c.name.startsWith('sb-')) {
              pageRedirectResponse.cookies.set(c.name, '', { maxAge: 0, path: '/' });
            }
          });

          return pageRedirectResponse;
        }

        console.log('User is authenticated, allowing access');
      }
    }

    return NextResponse.next({
      request: { headers: request.headers },
    });
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next({
      request: { headers: request.headers },
    });
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
