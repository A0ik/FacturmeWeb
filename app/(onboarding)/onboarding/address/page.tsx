'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function OnboardingAddressPage() {
  const router = useRouter();
  const { updateProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    address: '',
    postal_code: '',
    city: '',
    country: 'France',
    phone: '',
    iban: '',
    bic: '',
    bank_name: '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile(form as any);
      router.push('/onboarding/template');
    } catch {
      router.push('/onboarding/template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
        <div className="mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-black text-lg mb-4">F</div>
          <h2 className="text-2xl font-bold text-gray-900">Adresse & coordonnées</h2>
          <p className="text-gray-500 text-sm mt-1">Apparaîtront sur vos factures</p>
        </div>

        {/* Progress */}
        <div className="flex gap-1 mb-6">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className={`h-1.5 flex-1 rounded-full ${step <= 2 ? 'bg-primary' : 'bg-gray-200'}`} />
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Adresse" placeholder="123 rue de la Paix" value={form.address} onChange={(e) => set('address', e.target.value)} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Code postal" placeholder="75001" value={form.postal_code} onChange={(e) => set('postal_code', e.target.value)} />
            <Input label="Ville" placeholder="Paris" value={form.city} onChange={(e) => set('city', e.target.value)} className="col-span-2" />
          </div>
          <Input label="Téléphone" placeholder="+33 6 12 34 56 78" value={form.phone} onChange={(e) => set('phone', e.target.value)} />

          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Coordonnées bancaires <span className="text-xs text-gray-400 font-normal">(optionnel)</span></p>
            <div className="space-y-3">
              <Input label="Banque" placeholder="BNP Paribas" value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)} />
              <Input label="IBAN" placeholder="FR76 1234 5678..." value={form.iban} onChange={(e) => set('iban', e.target.value)} />
              <Input label="BIC/SWIFT" placeholder="BNPAFRPP" value={form.bic} onChange={(e) => set('bic', e.target.value)} />
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={() => router.push('/onboarding/template')}>
              Passer
            </Button>
            <Button type="submit" className="flex-1" loading={loading}>
              Continuer →
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
