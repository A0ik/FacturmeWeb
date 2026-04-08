import { v4 as uuidv4 } from 'uuid';

export function generateId(): string { return uuidv4(); }

export function formatCurrency(amount: number, currency = 'EUR', locale = 'fr-FR'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

export function formatDate(dateStr: string, locale = 'fr-FR'): string {
  return new Date(dateStr).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
}

export function formatDateShort(dateStr: string, locale = 'fr-FR'): string {
  return new Date(dateStr).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export const CURRENCIES = [
  { code: 'EUR', label: 'Euro (€)', symbol: '€' },
  { code: 'USD', label: 'US Dollar ($)', symbol: '$' },
  { code: 'GBP', label: 'British Pound (£)', symbol: '£' },
  { code: 'CAD', label: 'Canadian Dollar (CA$)', symbol: 'CA$' },
  { code: 'AUD', label: 'Australian Dollar (A$)', symbol: 'A$' },
  { code: 'JPY', label: 'Japanese Yen (¥)', symbol: '¥' },
  { code: 'CHF', label: 'Swiss Franc (CHF)', symbol: 'CHF' },
  { code: 'CNY', label: 'Chinese Yuan (¥)', symbol: '¥' },
  { code: 'INR', label: 'Indian Rupee (₹)', symbol: '₹' },
  { code: 'BRL', label: 'Brazilian Real (R$)', symbol: 'R$' },
  { code: 'MXN', label: 'Mexican Peso (MX$)', symbol: 'MX$' },
  { code: 'SEK', label: 'Swedish Krona (kr)', symbol: 'kr' },
];

export const SECTORS = [
  'Bâtiment & Travaux', 'Plomberie', 'Électricité', 'Menuiserie',
  'Peinture & Décoration', 'Restauration & Hôtellerie', 'Informatique & Tech',
  'Conseil & Formation', 'Santé & Bien-être', 'Transport & Livraison',
  'Jardinage & Paysagisme', 'Nettoyage & Entretien', 'Auto & Moto',
  'Coiffure & Beauté', 'Photographie & Vidéo', 'Communication & Marketing', 'Autre',
];

export const LEGAL_STATUSES = [
  { value: 'auto-entrepreneur', label: 'Auto-entrepreneur' },
  { value: 'eirl', label: 'EIRL' },
  { value: 'eurl', label: 'EURL' },
  { value: 'sarl', label: 'SARL' },
  { value: 'sas', label: 'SAS' },
  { value: 'sasu', label: 'SASU' },
  { value: 'sa', label: 'SA' },
  { value: 'autre', label: 'Autre' },
];

export const ACCENT_COLORS = ['#1D9E75', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444', '#0F172A'];

export const DOC_LABELS: Record<string, string> = {
  invoice: 'Facture', quote: 'Devis', credit_note: 'Avoir',
  purchase_order: 'Bon de commande', delivery_note: 'Bon de livraison',
};

export function downloadCSV(filename: string, headers: string[], rows: (string | number | undefined | null)[][]): void {
  const escape = (v: string | number | undefined | null) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function validateSiret(siret: string): boolean {
  if (!siret) return true;
  const s = siret.replace(/\s/g, '');
  return /^\d{14}$/.test(s);
}

export function validateVatNumber(vat: string): boolean {
  if (!vat) return true;
  return /^[A-Z]{2}[A-Z0-9]{2}[0-9]{9}$/.test(vat.replace(/\s/g, '').toUpperCase());
}
