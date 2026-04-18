'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function CallbackPage() {
  const router = useRouter();
  const { fetchProfile } = useAuthStore();

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (session?.user) {
        await fetchProfile(session.user.id);
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    };
    handleCallback();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 text-sm">Connexion en cours...</p>
      </div>
    </div>
  );
}
