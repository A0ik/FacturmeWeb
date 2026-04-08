import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PUBLIC_PATHS = ['/login', '/register', '/auth/callback', '/onboarding'];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const pathname = req.nextUrl.pathname;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return res;
  if (pathname.startsWith('/api/stripe/webhook')) return res;
  if (pathname.startsWith('/api/share/')) return res;
  if (pathname.startsWith('/share/')) return res;
  if (pathname.startsWith('/workspace/join')) return res;
  if (pathname === '/') return res;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookies: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookies.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options as any);
          });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  const PROTECTED = ['/dashboard', '/invoices', '/clients', '/crm', '/settings', '/recurring', '/paywall', '/workspace', '/notifications', '/help'];
  if (!session && PROTECTED.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)'],
};
