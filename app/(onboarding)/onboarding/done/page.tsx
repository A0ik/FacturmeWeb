'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';

export default function OnboardingDonePage() {
  const router = useRouter();
  const { updateProfile } = useAuthStore();

  useEffect(() => {
    updateProfile({ onboarding_done: true } as any).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-primary-light flex items-center justify-center">
            <CheckCircle size={52} className="text-primary" />
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-black text-gray-900">C'est parti !</h2>
          <p className="text-gray-500 mt-2">Votre espace est prêt. Créez votre première facture en quelques secondes.</p>
        </div>

        <div className="space-y-3">
          <Button className="w-full" size="lg" onClick={() => router.push('/dashboard')}>
            Accéder au tableau de bord
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => router.push('/invoices/new')}>
            Créer ma première facture
          </Button>
        </div>
      </div>
    </div>
  );
}
