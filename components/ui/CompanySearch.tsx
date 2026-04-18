'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, Building2 } from 'lucide-react';

export interface CompanyResult {
  name: string;
  siret: string;
  siren: string;
  address: string;
  postal_code: string;
  city: string;
  vat_number: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (company: CompanyResult) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

function computeFrenchVAT(siren: string): string {
  if (!siren || siren.length !== 9) return '';
  const key = (12 + 3 * (parseInt(siren, 10) % 97)) % 97;
  return `FR${String(key).padStart(2, '0')}${siren}`;
}

export function CompanySearch({ value, onChange, onSelect, label, placeholder, required }: Props) {
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const search = async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(q)}&page=1&per_page=6`,
      );
      const data = await res.json();
      const companies: CompanyResult[] = (data.results || []).map((r: any) => {
        const siege = r.siege || {};
        const addressParts = [
          siege.numero_voie,
          siege.type_voie,
          siege.libelle_voie,
        ].filter(Boolean).join(' ');
        return {
          name: r.nom_complet || r.nom_raison_sociale || '',
          siret: siege.siret || '',
          siren: r.siren || '',
          address: siege.geo_adresse || addressParts,
          postal_code: siege.code_postal || '',
          city: siege.libelle_commune || '',
          vat_number: computeFrenchVAT(r.siren || ''),
        };
      });
      setResults(companies);
      setOpen(companies.length > 0);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => search(v), 350);
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="text-sm font-semibold text-gray-700 block mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder || 'Rechercher par nom ou SIRET...'}
          required={required}
          className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary pr-9"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {searching ? (
            <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <Search size={14} className="text-gray-400" />
          )}
        </div>
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="px-3 py-1.5 border-b border-gray-50">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Résultats — Base SIRENE (données officielles)
            </p>
          </div>
          {results.map((company, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { onSelect(company); onChange(company.name); setOpen(false); }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
            >
              <div className="flex items-start gap-2.5">
                <Building2 size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{company.name}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {company.siret && `SIRET ${company.siret}`}
                    {company.city && ` · ${company.postal_code} ${company.city}`}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
