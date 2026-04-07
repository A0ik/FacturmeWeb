'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { AuthPage } from '@/components/ui/auth-page';

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, signInWithGoogle, loading } = useAuthStore();
  const [error, setError] = useState('');
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  const handleEmailRegister = async (email: string, password: string) => {
    setError('');
    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères');
      return;
    }
    try {
      setPendingEmail(email);
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
      <div className="min-h-screen bg-gradient-to-br from-primary-light via-white to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto">
            <Mail size={28} className="text-primary" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Vérifiez votre email</h2>
          <p className="text-gray-500 text-sm">
            Un lien de confirmation a été envoyé à <strong>{pendingEmail}</strong>.
            Cliquez dessus pour activer votre compte.
          </p>
          <Link href="/login" className="text-primary font-semibold text-sm hover:underline">
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AuthPage
      mode="register"
      onEmailLogin={handleEmailRegister}
      onGoogleLogin={handleGoogle}
      loading={loading}
      error={error}
      toggleHref="/login"
    />
  );
}
