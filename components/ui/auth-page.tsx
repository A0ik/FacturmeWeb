'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AtSignIcon, ChevronLeftIcon, Lock } from 'lucide-react';
import Link from 'next/link';

/* ——— Animated background paths ——— */
function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg className="h-full w-full text-slate-800" viewBox="0 0 696 316" fill="none">
        <title>Background Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.08 + path.id * 0.02}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{ pathLength: 1, opacity: [0.3, 0.6, 0.3], pathOffset: [0, 1, 0] }}
            transition={{ duration: 20 + Math.random() * 10, repeat: Infinity, ease: 'linear' }}
          />
        ))}
      </svg>
    </div>
  );
}

/* ——— Google SVG icon ——— */
const GoogleIcon = (props: React.ComponentProps<'svg'>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12.479,14.265v-3.279h11.049c0.108,0.571,0.164,1.247,0.164,1.979c0,2.46-0.672,5.502-2.84,7.669C18.744,22.829,16.051,24,12.483,24C5.869,24,0.308,18.613,0.308,12S5.869,0,12.483,0c3.659,0,6.265,1.436,8.223,3.307L18.392,5.62c-1.404-1.317-3.307-2.341-5.913-2.341C7.65,3.279,3.873,7.171,3.873,12s3.777,8.721,8.606,8.721c3.132,0,4.916-1.258,6.059-2.401c0.927-0.927,1.537-2.251,1.777-4.059L12.479,14.265z" />
  </svg>
);

const AuthSeparator = () => (
  <div className="flex w-full items-center justify-center">
    <div className="h-px w-full bg-gray-200" />
    <span className="px-2 text-xs text-gray-400">OU</span>
    <div className="h-px w-full bg-gray-200" />
  </div>
);

/* ——— Props ——— */
export interface AuthPageProps {
  /** Called when user submits email/password form */
  onEmailLogin?: (email: string, password: string) => Promise<void>;
  /** Called when user clicks Google button */
  onGoogleLogin?: () => Promise<void>;
  loading?: boolean;
  error?: string;
  /** 'login' | 'register' — controls button labels */
  mode?: 'login' | 'register';
  /** Link href for bottom toggle (register/login) */
  toggleHref?: string;
}

export function AuthPage({
  onEmailLogin,
  onGoogleLogin,
  loading = false,
  error,
  mode = 'login',
  toggleHref,
}: AuthPageProps) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onEmailLogin?.(email, password);
  };

  const isLogin = mode === 'login';

  return (
    <main className="relative md:h-screen md:overflow-hidden lg:grid lg:grid-cols-2">
      {/* ——— Left panel (desktop only) ——— */}
      <div className="relative hidden h-full flex-col border-r border-gray-200 bg-gradient-to-br from-primary-light via-white to-blue-50 p-10 lg:flex">
        <div className="from-white absolute inset-0 z-10 bg-gradient-to-t to-transparent" />
        <div className="z-10 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg">
            <span className="text-lg font-black text-white">F</span>
          </div>
          <p className="text-xl font-bold text-gray-900">Factu.me</p>
        </div>
        <div className="z-10 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg text-gray-700">
              &ldquo;Factu.me m&apos;a permis de gagner un temps considérable sur ma facturation et d&apos;offrir un meilleur service à mes clients.&rdquo;
            </p>
            <footer className="font-mono text-sm font-semibold text-gray-500">~ Ali Hassan</footer>
          </blockquote>
        </div>
        <div className="absolute inset-0">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>
      </div>

      {/* ——— Right panel (form) ——— */}
      <div className="relative flex min-h-screen flex-col justify-center p-4 bg-white">
        {/* Back to home */}
        <Link
          href="/"
          className="absolute top-6 left-5 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ChevronLeftIcon className="size-4" />
          Accueil
        </Link>

        <div className="mx-auto w-full max-w-sm space-y-5">
          {/* Logo (mobile only) */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-lg">
              <span className="text-lg font-black text-white">F</span>
            </div>
            <p className="text-xl font-bold text-gray-900">Factu.me</p>
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {isLogin ? 'Connexion' : 'Créer un compte'}
            </h1>
            <p className="text-sm text-gray-500">
              {isLogin ? 'Connectez-vous à votre espace Factu.me.' : 'Commencez votre facturation intelligente.'}
            </p>
          </div>

          {/* Social buttons */}
          <div className="space-y-2">
            <button
              type="button"
              disabled={loading}
              onClick={onGoogleLogin}
              className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50"
            >
              <GoogleIcon className="size-4" />
              Continuer avec Google
            </button>
          </div>

          <AuthSeparator />

          {/* Email/password form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-xs text-gray-400">
              Entrez votre email pour {isLogin ? 'vous connecter' : 'créer votre compte'}
            </p>

            {/* Email */}
            <div className="relative">
              <input
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <AtSignIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            </div>

            {/* Password */}
            <div className="relative">
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-dark disabled:opacity-50"
            >
              {loading ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : null}
              {isLogin ? 'Se connecter' : 'Créer mon compte'}
            </button>
          </form>

          {/* Toggle link */}
          {toggleHref && (
            <p className="text-center text-sm text-gray-500">
              {isLogin ? 'Pas encore de compte ? ' : 'Déjà un compte ? '}
              <Link href={toggleHref} className="font-semibold text-primary hover:underline">
                {isLogin ? 'Créer un compte' : 'Se connecter'}
              </Link>
            </p>
          )}

          {/* Terms */}
          <p className="text-center text-xs text-gray-400">
            En continuant, vous acceptez nos{' '}
            <a href="#" className="underline underline-offset-2 hover:text-primary">Conditions d&apos;utilisation</a>
            {' '}et notre{' '}
            <a href="#" className="underline underline-offset-2 hover:text-primary">Politique de confidentialité</a>.
          </p>
        </div>
      </div>
    </main>
  );
}

export default AuthPage;
