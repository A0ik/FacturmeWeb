'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import Button from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { LEGAL_STATUSES, SECTORS } from '@/lib/utils';

export default function OnboardingCompanyPage() {
  const router = useRouter();
  const { updateProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    first_name: '',
    last_name: '',
    legal_status: '',
    sector: '',
    siret: '',
    vat_number: '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_name) return;
    setLoading(true);
    try {
      await updateProfile(form as any);
      router.push('/onboarding/address');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
        <div className="mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-black text-lg mb-4">F</div>
          <h2 className="text-2xl font-bold text-gray-900">Votre entreprise</h2>
          <p className="text-gray-500 text-sm mt-1">Configurez votre profil professionnel</p>
        </div>

        {/* Progress */}
        <div className="flex gap-1 mb-6">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className={`h-1.5 flex-1 rounded-full ${step <= 1 ? 'bg-primary' : 'bg-gray-200'}`} />
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nom de l'entreprise *" placeholder="Ma Super Entreprise" value={form.company_name} onChange={(e) => set('company_name', e.target.value)} required />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Prénom" placeholder="Jean" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
            <Input label="Nom" placeholder="Dupont" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
          </div>

          <Select
            label="Statut juridique"
            value={form.legal_status}
            onChange={(e) => set('legal_status', e.target.value)}
            options={[{ value: '', label: 'Choisir...' }, ...LEGAL_STATUSES.map((s) => ({ value: s.value, label: s.label }))]}
          />

          <Select
            label="Secteur d'activité"
            value={form.sector}
            onChange={(e) => set('sector', e.target.value)}
            options={[{ value: '', label: 'Choisir...' }, ...SECTORS.map((s) => ({ value: s, label: s }))]}
          />

          <Input label="SIRET" placeholder="12345678901234" value={form.siret} onChange={(e) => set('siret', e.target.value)} />
          <Input label="Numéro TVA" placeholder="FR12345678901" value={form.vat_number} onChange={(e) => set('vat_number', e.target.value)} />

          <Button type="submit" className="w-full mt-2" loading={loading}>
            Continuer →
          </Button>
        </form>
      </div>
    </div>
  );
}
