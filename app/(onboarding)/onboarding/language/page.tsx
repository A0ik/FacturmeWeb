'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { changeLanguage } from '@/i18n';

export default function OnboardingLanguagePage() {
  const router = useRouter();
  const { updateProfile, user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  const handleSelect = async (lang: 'fr' | 'en') => {
    setLoading(true);
    try {
      await changeLanguage(lang);
      await updateProfile({ language: lang } as any);
      router.push('/onboarding/company');
    } catch (err) {
      console.error('Failed to save language:', err);
      // Still navigate so user doesn't get stuck, but try again in background
      router.push('/onboarding/company');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary shadow-lg mb-4">
            <span className="text-white font-black text-3xl">F</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900">Factu.me</h1>
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Bienvenue / Welcome</h2>
        <p className="text-center text-gray-500 mb-8">Choisissez votre langue<br />Choose your language</p>

        <div className="space-y-3">
          {[
            { lang: 'fr' as const, flag: '🇫🇷', name: 'Français', sub: 'French' },
            { lang: 'en' as const, flag: '🇬🇧', name: 'English', sub: 'Anglais' },
          ].map(({ lang, flag, name, sub }) => (
            <button
              key={lang}
              onClick={() => handleSelect(lang)}
              disabled={loading}
              className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border-2 border-gray-200 hover:border-primary hover:bg-primary-light/50 transition-all shadow-sm disabled:opacity-50 group"
            >
              <span className="text-4xl">{flag}</span>
              <div className="flex-1 text-left">
                <p className="font-bold text-gray-900 text-lg">{name}</p>
                <p className="text-sm text-gray-500">{sub}</p>
              </div>
              <span className="text-primary text-xl group-hover:translate-x-1 transition-transform">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
