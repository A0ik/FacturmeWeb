'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AtSignIcon, ChevronLeftIcon, Lock, Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

/* ——— Testimonials data ——— */
const TESTIMONIALS = [
  {
    text: "Factu.me m'a permis de gagner un temps considérable sur ma facturation et d'offrir un meilleur service à mes clients.",
    author: "Ali Hassan",
    role: "Développeur freelance",
    initials: "AH",
    color: "from-blue-500 to-indigo-600",
  },
  {
    text: "L'interface est incroyablement intuitive. Je crée une facture en moins de 2 minutes. Indispensable !",
    author: "Sophie Martin",
    role: "Designer UX",
    initials: "SM",
    color: "from-pink-500 to-rose-600",
  },
  {
    text: "La dictée vocale IA est une révolution. J'enregistre mes prestations depuis mon téléphone pendant mes déplacements.",
    author: "Karim Benali",
    role: "Consultant RH",
    initials: "KB",
    color: "from-emerald-500 to-teal-600",
  },
  {
    text: "Enfin un outil de facturation moderne qui comprend les besoins des indépendants. Les relances automatiques me sauvent la mise !",
    author: "Laura Dupont",
    role: "Chef de projet",
    initials: "LD",
    color: "from-violet-500 to-purple-600",
  },
  {
    text: "L'export FEC pour mon comptable est parfait. Je n'ai plus besoin de ressaisir quoi que ce soit.",
    author: "Pierre Moreau",
    role: "Architecte",
    initials: "PM",
    color: "from-amber-500 to-orange-600",
  },
  {
    text: "Le pipeline CRM intégré est une vraie plus-value. Je suis mes prospects et mes factures au même endroit.",
    author: "Nadia El Khatib",
    role: "Chargée de compte",
    initials: "NK",
    color: "from-cyan-500 to-sky-600",
  },
];

function TestimonialCard({ text, author, role, initials, color }: typeof TESTIMONIALS[0]) {
  return (
    <div className="flex-shrink-0 w-72 bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-5 space-y-4">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} size={13} className="text-amber-400 fill-amber-400" />
        ))}
      </div>
      <p className="text-sm text-white/90 leading-relaxed">&ldquo;{text}&rdquo;</p>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
          <span className="text-xs font-bold text-white">{initials}</span>
        </div>
        <div>
          <p className="text-xs font-bold text-white">{author}</p>
          <p className="text-[11px] text-white/50">{role}</p>
        </div>
      </div>
    </div>
  );
}

function ScrollingTestimonials() {
  const rowRef1 = useRef<HTMLDivElement>(null);
  const rowRef2 = useRef<HTMLDivElement>(null);

  return (
    <div className="relative overflow-hidden mt-auto space-y-3 pb-2">
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-gray-950 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-gray-950 to-transparent z-10 pointer-events-none" />

      {/* Row 1 — scrolls left */}
      <motion.div
        ref={rowRef1}
        className="flex gap-3"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      >
        {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
          <TestimonialCard key={i} {...t} />
        ))}
      </motion.div>

      {/* Row 2 — scrolls right */}
      <motion.div
        ref={rowRef2}
        className="flex gap-3"
        animate={{ x: ['-50%', '0%'] }}
        transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
      >
        {[...TESTIMONIALS.slice(3), ...TESTIMONIALS.slice(0, 3), ...TESTIMONIALS.slice(3), ...TESTIMONIALS.slice(0, 3)].map((t, i) => (
          <TestimonialCard key={i} {...t} />
        ))}
      </motion.div>
    </div>
  );
}

/* ——— Animated background paths ——— */
function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg className="h-full w-full text-slate-700" viewBox="0 0 696 316" fill="none">
        <title>Background</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.05 + path.id * 0.01}
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
  onEmailLogin?: (email: string, password: string) => Promise<void>;
  onGoogleLogin?: () => Promise<void>;
  loading?: boolean;
  error?: string;
  mode?: 'login' | 'register';
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
      <div className="relative hidden h-full flex-col bg-gray-950 p-10 lg:flex overflow-hidden">
        <FloatingPaths position={1} />
        <FloatingPaths position={-1} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg flex-shrink-0">
            <Image src="/icons/icon.svg" alt="Factu.me" width={36} height={36} className="w-full h-full object-cover" />
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-xl font-black text-white">Factu</span>
            <span className="text-xl font-black text-primary">.me</span>
          </div>
        </div>

        {/* Central message */}
        <div className="relative z-10 mt-12 flex-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-3xl font-black text-white leading-tight mb-4">
              La facturation<br />
              <span className="text-primary">intelligente</span> pour<br />
              les pros.
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
              Créez des factures professionnelles, suivez vos paiements et gérez votre comptabilité — le tout en quelques secondes.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {[
                { label: '10k+ utilisateurs', color: 'bg-primary/20 text-primary border-primary/20' },
                { label: 'Export FEC', color: 'bg-white/8 text-white/60 border-white/10' },
                { label: 'Dictée IA', color: 'bg-white/8 text-white/60 border-white/10' },
              ].map((badge) => (
                <span key={badge.label} className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${badge.color}`}>
                  {badge.label}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Scrolling testimonials at bottom */}
        <div className="relative z-10 -mx-10">
          <ScrollingTestimonials />
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
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg flex-shrink-0">
              <Image src="/icons/icon.svg" alt="Factu.me" width={36} height={36} className="w-full h-full object-cover" />
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-xl font-black text-gray-900">Factu</span>
              <span className="text-xl font-black text-primary">.me</span>
            </div>
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
