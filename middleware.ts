import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Routes publiques explicites (pas besoin d'auth)
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/auth/callback',
  '/onboarding',
];

// Routes API/pages publiques par préfixe
const PUBLIC_PREFIXES = [
  '/api/stripe/webhook',
  '/api/share/',
  '/api/client-portal/',
  '/share/',
  '/client/',
  '/workspace/join',
];

// Préfixes protégés : tout ce qui commence par ces segments nécessite une session
// Mis à jour automatiquement : ajouter ici tout nouveau segment de route protégée
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/invoices',
  '/clients',
  '/crm',
  '/settings',
  '/recurring',
  '/paywall',
  '/workspace',
  '/notifications',
  '/help',
  '/expenses',
  '/products',
  '/calendar',
  '/accounting',
  '/activity',
  '/banking',
  '/capture',
  '/contracts',
  '/documents',
  '/trial',
];

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const pathname = req.nextUrl.pathname;

  // Racine toujours publique
  if (pathname === '/') return res;

  // Chemins publics exacts
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return res;

  // Préfixes publics
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return res;

  // Vérifier si Supabase est configuré
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Missing Supabase environment variables in middleware');
    return res;
  }

  // N'effectuer la vérification auth que pour les routes protégées
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return res;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(cookieList: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookieList.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
          });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)'],
};
