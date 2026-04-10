'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CompanySearch } from '@/components/ui/CompanySearch';
import { LEGAL_STATUSES, SECTORS } from '@/lib/utils';
import { Check, ChevronDown, Building2, Briefcase } from 'lucide-react';

/* ── Nice searchable dropdown ── */
function SearchableSelect({
  label,
  icon: Icon,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; desc?: string }[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const selected = options.find((o) => o.value === value);
  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div ref={ref} className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch(''); }}
        className="w-full flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-left transition-all hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      >
        <Icon size={16} className={selected ? 'text-primary' : 'text-gray-400'} />
        <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={14} className={`ml-auto text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-[4.5rem] w-[calc(100%-2.5rem)] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto">
          <div className="sticky top-0 bg-white p-2 border-b border-gray-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">Aucun résultat</div>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-center gap-2.5 border-b border-gray-50 last:border-0"
              >
                {value === opt.value ? (
                  <Check size={14} className="text-primary flex-shrink-0" />
                ) : (
                  <span className="w-3.5 flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                  {opt.desc && <p className="text-xs text-gray-400">{opt.desc}</p>}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function OnboardingCompanyPage() {
  const router = useRouter();
  const { updateProfile, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    company_name: '',
    first_name: '',
    last_name: '',
    legal_status: '',
    sector: '',
    siret: '',
    vat_number: '',
    address: '',
    postal_code: '',
    city: '',
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_name.trim()) {
      setError('Le nom de l\'entreprise est requis');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await updateProfile(form as any);
      router.push('/onboarding/address');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde. Vérifiez votre connexion et réessayez.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
        <div className="mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-black text-lg mb-4">F</div>
          <h2 className="text-2xl font-bold text-gray-900">Votre entreprise</h2>
          <p className="text-gray-500 text-sm mt-1">Recherchez votre entreprise ou remplissez manuellement</p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mb-6">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className={`h-1.5 flex-1 rounded-full ${step <= 1 ? 'bg-primary' : 'bg-gray-200'}`} />
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Company search with auto-fill */}
          <CompanySearch
            label="Nom de l'entreprise *"
            value={form.company_name}
            onChange={(v) => set('company_name', v)}
            onSelect={(company) => {
              set('company_name', company.name);
              if (company.siret) set('siret', company.siret);
              if (company.address) set('address', company.address);
              if (company.postal_code) set('postal_code', company.postal_code);
              if (company.city) set('city', company.city);
              if (company.vat_number) set('vat_number', company.vat_number);
            }}
            placeholder="Rechercher votre entreprise..."
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Prénom" placeholder="Jean" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
            <Input label="Nom" placeholder="Dupont" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
          </div>

          {/* Legal status - nice searchable dropdown */}
          <div className="relative">
            <SearchableSelect
              label="Statut juridique"
              icon={Building2}
              value={form.legal_status}
              onChange={(v) => set('legal_status', v)}
              options={LEGAL_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
              placeholder="Choisir le statut..."
            />
          </div>

          {/* Sector - nice searchable dropdown */}
          <div className="relative">
            <SearchableSelect
              label="Secteur d'activité"
              icon={Briefcase}
              value={form.sector}
              onChange={(v) => set('sector', v)}
              options={SECTORS.map((s) => ({ value: s, label: s }))}
              placeholder="Choisir le secteur..."
            />
          </div>

          <Input label="SIRET" placeholder="12345678901234" value={form.siret} onChange={(e) => set('siret', e.target.value)} />
          <Input label="Numéro TVA" placeholder="FR12345678901" value={form.vat_number} onChange={(e) => set('vat_number', e.target.value)} />

          {/* Error display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full mt-2" loading={loading}>
            Continuer →
          </Button>
        </form>
      </div>
    </div>
  );
}
