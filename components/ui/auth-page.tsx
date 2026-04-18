'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AtSignIcon, ChevronLeftIcon, Lock, Eye, EyeOff, Check, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

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

/* ——— LA FACTURE 3D CARTOON ——— */
function FloatingInvoice3D() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -25, y: x * 25 });
    setGlare({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setGlare({ x: 50, y: 50 });
  };

  return (
    <div
      className="relative z-10 mx-auto w-[340px] sm:w-[400px] select-none"
      style={{ perspective: '1200px' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="rounded-2xl bg-white p-6 sm:p-8 border border-gray-200/80 shadow-2xl transition-all duration-150 ease-out origin-center relative overflow-hidden"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.08) translateZ(20px)`,
          transformStyle: 'preserve-3d',
          boxShadow: `-${tilt.y * 8}px ${tilt.x * 8}px 50px rgba(0,0,0,0.2), 0 0 80px rgba(29,158,117,0.08)`
        }}
      >
        {/* Glare effect */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.25) 0%, transparent 60%)`,
            opacity: Math.abs(tilt.x) + Math.abs(tilt.y) > 2 ? 1 : 0
          }}
        />

        {/* Accent bar at top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-primary rounded-t-2xl" style={{ transform: 'translateZ(10px)' }} />

        <div className="flex justify-between items-start mb-7" style={{ transform: 'translateZ(15px)' }}>
          <div>
            <div className="h-5 w-24 rounded bg-primary/80 mb-2.5" />
            <div className="h-2.5 w-40 rounded bg-gray-200" />
            <div className="h-2 w-28 rounded bg-gray-100 mt-2" />
            <div className="h-2 w-32 rounded bg-gray-100 mt-1.5" />
          </div>
          <div className="text-right">
            <div className="inline-block px-3 py-1.5 rounded-lg bg-gray-900 text-white text-[11px] font-bold tracking-widest">
              FACTURE
            </div>
            <div className="h-2 w-20 rounded bg-gray-100 ml-auto mt-3" />
            <div className="h-2 w-24 rounded bg-gray-100 ml-auto mt-1.5" />
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100" style={{ transform: 'translateZ(10px)' }}>
          <div className="h-2.5 w-14 rounded bg-gray-300 mb-2.5" />
          <div className="h-2 w-full rounded bg-gray-200 mb-1.5" />
          <div className="h-2 w-4/5 rounded bg-gray-200" />
          <div className="h-2 w-2/3 rounded bg-gray-100 mt-1.5" />
        </div>

        <div className="space-y-3 mb-6" style={{ transform: 'translateZ(8px)' }}>
          {[
            { w: 'w-full', price: 'w-16' },
            { w: 'w-5/6', price: 'w-12' },
            { w: 'w-2/3', price: 'w-14' },
            { w: 'w-3/4', price: 'w-10' },
          ].map((row, i) => (
            <div key={i} className="flex gap-2.5 items-center">
              <div className="h-2.5 w-2.5 rounded-full bg-primary" />
              <div className={`h-2 ${row.w} rounded bg-gray-200`} />
              <div className={`h-2 ${row.price} rounded bg-gray-300 ml-auto`} />
            </div>
          ))}
        </div>

        <div className="border-t-2 border-dashed border-gray-200 pt-4 flex justify-between items-end" style={{ transform: 'translateZ(12px)' }}>
          <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total TTC</span>
          <span className="text-3xl font-black text-gray-900">1 240,00 <span className="text-primary">€</span></span>
        </div>

        {/* Bottom accent */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center" style={{ transform: 'translateZ(5px)' }}>
          <div className="flex gap-1.5">
            <div className="h-1.5 w-8 rounded bg-gray-100" />
            <div className="h-1.5 w-12 rounded bg-gray-100" />
            <div className="h-1.5 w-6 rounded bg-gray-100" />
          </div>
          <div className="h-1.5 w-16 rounded bg-primary/30" />
        </div>
      </div>
    </div>
  );
}

/* ——— Password strength checker ——— */
interface PasswordCheck {
  label: string;
  test: (p: string) => boolean;
}

const PASSWORD_CHECKS: PasswordCheck[] = [
  { label: 'Au moins 8 caractères', test: (p) => p.length >= 8 },
  { label: 'Une lettre majuscule', test: (p) => /[A-Z]/.test(p) },
  { label: 'Une lettre minuscule', test: (p) => /[a-z]/.test(p) },
  { label: 'Un chiffre', test: (p) => /[0-9]/.test(p) },
  { label: 'Un caractère spécial', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  const passed = PASSWORD_CHECKS.filter((c) => c.test(password)).length;
  if (passed <= 1) return { score: 1, label: 'Très faible', color: 'bg-red-500' };
  if (passed === 2) return { score: 2, label: 'Faible', color: 'bg-orange-500' };
  if (passed === 3) return { score: 3, label: 'Moyen', color: 'bg-amber-500' };
  if (passed === 4) return { score: 4, label: 'Fort', color: 'bg-green-500' };
  return { score: 5, label: 'Très fort', color: 'bg-emerald-500' };
}

/* ——— Props ——— */
export interface AuthPageProps {
  onEmailLogin?: (email: string, password: string, confirmPassword?: string) => Promise<void>;
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
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const isLogin = mode === 'login';
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const allChecksPassed = PASSWORD_CHECKS.every((c) => c.test(password));
  const passwordsMatch = !isLogin && confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin) {
      if (password !== confirmPassword) return;
      if (!allChecksPassed) return;
    }
    await onEmailLogin?.(email, password, confirmPassword);
  };

  const canSubmit = isLogin
    ? email.length > 0 && password.length > 0
    : email.length > 0 && allChecksPassed && password === confirmPassword;

  return (
    <main className="relative md:h-screen md:overflow-hidden lg:grid lg:grid-cols-2">

      {/* ——— Left panel (desktop only) ——— */}
      <div className="relative hidden h-full flex-col bg-gray-950 p-10 lg:flex overflow-hidden">

        {/* VISUEL : Grille + Lumière */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          />
          <div className="absolute right-[10%] bottom-[20%] w-[500px] h-[500px] rounded-full bg-primary/30 blur-[120px]" />
        </div>

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

        {/* GROUPE : Texte + Facture + Visages */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center py-6">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-5"
          >
            <h2 className="text-3xl font-black text-white leading-tight mb-3">
              Factures, CRM,<br />
              <span className="text-primary">tout centralisé.</span>
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm mx-auto">
              Relances IA, scan de reçus, pipeline de ventes et comptabilité. Gérez votre activité sans friction.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.35, type: "spring", stiffness: 80, damping: 15 }}
            className="flex-1 flex items-center justify-center w-full"
          >
            <FloatingInvoice3D />
          </motion.div>

          {/* Visages */}
          <div className="w-full max-w-xs mt-5 border-t border-white/10 pt-5">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face" alt="Utilisateur" className="w-9 h-9 rounded-full border-2 border-gray-950 object-cover shadow-lg" />
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face" alt="Utilisatrice" className="w-9 h-9 rounded-full border-2 border-gray-950 object-cover shadow-lg" />
                <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face" alt="Utilisateur" className="w-9 h-9 rounded-full border-2 border-gray-950 object-cover shadow-lg" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-white">Ils nous font confiance</p>
                <p className="text-xs text-gray-500">Rejoignez +2 000 freelances</p>
              </div>
            </div>
          </div>

        </div> {/* FIN DU GROUPE GAUCHE */}
      </div>

      {/* ——— Right panel (form) ——— */}
      <div className="relative flex min-h-screen flex-col justify-center p-4 bg-white">
        <Link href="/" className="absolute top-6 left-5 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ChevronLeftIcon className="size-4" /> Accueil
        </Link>

        <div className="mx-auto w-full max-w-sm space-y-5">
          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg flex-shrink-0">
              <Image src="/icons/icon.svg" alt="Factu.me" width={36} height={36} className="w-full h-full object-cover" />
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-xl font-black text-gray-900">Factu</span>
              <span className="text-xl font-black text-primary">.me</span>
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{isLogin ? 'Connexion' : 'Créer un compte'}</h1>
            <p className="text-sm text-gray-500">{isLogin ? 'Connectez-vous à votre espace Factu.me.' : 'Commencez votre facturation intelligente.'}</p>
          </div>

          <div className="space-y-2">
            <button type="button" disabled={loading} onClick={onGoogleLogin} className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50">
              <GoogleIcon className="size-4" /> Continuer avec Google
            </button>
          </div>

          <AuthSeparator />

          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-xs text-gray-400">Entrez votre email pour {isLogin ? 'vous connecter' : 'créer votre compte'}</p>

            <div className="relative">
              <input type="email" placeholder="votre@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
              <AtSignIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            </div>

            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} placeholder={isLogin ? '••••••••' : 'Choisissez un mot de passe'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={isLogin ? 1 : 8} className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>

            {!isLogin && password.length > 0 && (
              <div className="space-y-2.5 bg-gray-50 rounded-xl p-3 border border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} style={{ width: `${(strength.score / 5) * 100}%` }} />
                  </div>
                  <span className={`text-[11px] font-bold ${strength.score >= 4 ? 'text-green-600' : strength.score >= 3 ? 'text-amber-600' : 'text-red-500'}`}>{strength.label}</span>
                </div>
                <div className="space-y-1">
                  {PASSWORD_CHECKS.map((check) => {
                    const passed = check.test(password);
                    return (
                      <div key={check.label} className="flex items-center gap-2">
                        {passed ? <Check size={12} className="text-green-500 flex-shrink-0" /> : <X size={12} className="text-gray-300 flex-shrink-0" />}
                        <span className={`text-[11px] ${passed ? 'text-green-600 font-medium' : 'text-gray-400'}`}>{check.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!isLogin && (
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} placeholder="Confirmez le mot de passe" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            )}

            {!isLogin && confirmPassword.length > 0 && (
              <div className="flex items-center gap-1.5">
                {passwordsMatch ? (
                  <><Check size={12} className="text-green-500" /><span className="text-[11px] text-green-600 font-medium">Les mots de passe correspondent</span></>
                ) : (
                  <><X size={12} className="text-red-400" /><span className="text-[11px] text-red-400">Les mots de passe ne correspondent pas</span></>
                )}
              </div>
            )}

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">{error}</p>}

            <button type="submit" disabled={loading || !canSubmit} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : null}
              {isLogin ? 'Se connecter' : 'Créer mon compte'}
            </button>
          </form>

          {toggleHref && (
            <p className="text-center text-sm text-gray-500">
              {isLogin ? 'Pas encore de compte ? ' : 'Déjà un compte ? '}
              <Link href={toggleHref} className="font-semibold text-primary hover:underline">{isLogin ? 'Créer un compte' : 'Se connecter'}</Link>
            </p>
          )}

          <p className="text-center text-xs text-gray-400">
            En continuant, vous acceptez nos <a href="#" className="underline underline-offset-2 hover:text-primary">Conditions d&apos;utilisation</a> {' '}et notre <a href="#" className="underline underline-offset-2 hover:text-primary">Politique de confidentialité</a>.
          </p>
        </div>
      </div>
    </main>
  );
}

export default AuthPage;