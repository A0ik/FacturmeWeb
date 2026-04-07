'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Mail, Lock } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, signInWithGoogle, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [confirmEmail, setConfirmEmail] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Le mot de passe doit faire au moins 6 caractères'); return; }
    try {
      await signUp(email, password);
      router.push('/onboarding/language');
    } catch (err: any) {
      if (err.message === 'CONFIRM_EMAIL') setConfirmEmail(true);
      else setError(err.message || 'Erreur lors de la création du compte');
    }
  };

  const handleGoogle = async () => {
    setError('');
    try { await signInWithGoogle(); }
    catch (err: any) { setError(err.message); }
  };

  if (confirmEmail) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto">
          <Mail size={28} className="text-primary" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Vérifiez votre email</h2>
        <p className="text-gray-500 text-sm">Un lien de confirmation a été envoyé à <strong>{email}</strong>. Cliquez dessus pour activer votre compte.</p>
        <Link href="/login" className="text-primary font-semibold text-sm hover:underline">Retour à la connexion</Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-gray-900 text-center">Créer un compte</h2>

      <button
        onClick={handleGoogle}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continuer avec Google
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">ou</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Email" type="email" placeholder="vous@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} icon={<Mail size={16} />} required />
        <Input label="Mot de passe" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} icon={<Lock size={16} />} required hint="Minimum 6 caractères" />
        {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <Button type="submit" className="w-full" loading={loading}>Créer mon compte</Button>
      </form>

      <p className="text-center text-xs text-gray-400">
        En créant un compte, vous acceptez nos{' '}
        <span className="text-primary font-medium cursor-pointer">Conditions d'utilisation</span>
      </p>

      <p className="text-center text-sm text-gray-500">
        Déjà un compte ?{' '}
        <Link href="/login" className="text-primary font-semibold hover:underline">Se connecter</Link>
      </p>
    </div>
  );
}
