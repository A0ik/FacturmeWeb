'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { AuthPage } from '@/components/ui/auth-page';

const PASSWORD_CHECKS = [
  { label: 'Au moins 8 caractères', test: (p: string) => p.length >= 8 },
  { label: 'Une lettre majuscule', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Une lettre minuscule', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Un chiffre', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Un caractère spécial', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, signInWithGoogle, loading } = useAuthStore();
  const [error, setError] = useState('');
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  const handleEmailRegister = async (email: string, password: string, confirmPassword?: string) => {
    setError('');

    // Validate password match
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    // Validate password strength
    const failedChecks = PASSWORD_CHECKS.filter((c) => !c.test(password));
    if (failedChecks.length > 0) {
      setError(`Le mot de passe doit contenir : ${failedChecks.map((c) => c.label.toLowerCase()).join(', ')}`);
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
