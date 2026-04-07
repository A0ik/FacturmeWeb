'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { AuthPage } from '@/components/ui/auth-page';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signInWithGoogle, loading } = useAuthStore();
  const [error, setError] = useState('');

  const handleEmailLogin = async (email: string, password: string) => {
    setError('');
    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Identifiants incorrects');
    }
  };

  const handleGoogle = async () => {
    setError('');
    try { await signInWithGoogle(); }
    catch (err: any) { setError(err.message); }
  };

  return (
    <AuthPage
      mode="login"
      onEmailLogin={handleEmailLogin}
      onGoogleLogin={handleGoogle}
      loading={loading}
      error={error}
      toggleHref="/register"
    />
  );
}
