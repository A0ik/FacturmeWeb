'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDataStore } from '@/stores/dataStore';
import Header from '@/components/layout/Header';
import Button from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { generateId, formatCurrency } from '@/lib/utils';
import { InvoiceItem } from '@/types';
import { Plus, Trash2 } from 'lucide-react';

const FREQ_OPTS = [
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'monthly', label: 'Mensuel' },
  { value: 'quarterly', label: 'Trimestriel' },
  { value: 'yearly', label: 'Annuel' },
];

const VAT_RATES = [{ value: '0', label: '0%' }, { value: '5.5', label: '5.5%' }, { value: '10', label: '10%' }, { value: '20', label: '20%' }];

export default function NewRecurringPage() {
  const router = useRouter();
  const { clients, createRecurringInvoice } = useDataStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientId, setClientId] = useState<string | null>(null);
  const [showSugg, setShowSugg] = useState(false);
  const [frequency, setFrequency] = useState('monthly');
  const [nextRunDate, setNextRunDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Omit<InvoiceItem, 'total'>[]>([
    { id: generateId(), description: '', quantity: 1, unit_price: 0, vat_rate: 20 },
  ]);

  const suggestions = clients.filter((c) => clientName.length >= 1 && c.name.toLowerCase().includes(clientName.toLowerCase()));
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const vatAmount = items.reduce((s, i) => s + i.quantity * i.unit_price * (i.vat_rate / 100), 0);
  const total = subtotal + vatAmount;

  const updateItem = (id: string, field: string, value: any) => setItems((prev) => prev.map((i) => i.id === id ? { ...i, [field]: value } : i));
  const addItem = () => setItems((prev) => [...prev, { id: generateId(), description: '', quantity: 1, unit_price: 0, vat_rate: 20 }]);
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await createRecurringInvoice({
        client_id: clientId || undefined,
        client_name_override: clientId ? undefined : clientName || undefined,
        frequency: frequency as any,
        next_run_date: nextRunDate,
        items: items as InvoiceItem[],
        notes: notes || undefined,
        is_active: true,
        auto_send: false,
        document_type: 'invoice',
      } as any);
      router.push('/recurring');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <Header title="Nouvelle récurrente" back="/recurring" />

      <form onSubmit={handleSave} className="space-y-4">
        {/* Client */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h3 className="font-bold text-gray-900 mb-3">Client</h3>
          <div className="relative">
            <Input placeholder="Nom du client" value={clientName} onChange={(e) => { setClientName(e.target.value); setClientId(null); setShowSugg(true); }} onFocus={() => setShowSugg(true)} onBlur={() => setTimeout(() => setShowSugg(false), 200)} />
            {showSugg && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {suggestions.map((c) => (
                  <button key={c.id} type="button" className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 font-medium" onMouseDown={() => { setClientName(c.name); setClientId(c.id); setShowSugg(false); }}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Frequency & date */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h3 className="font-bold text-gray-900">Planification</h3>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Fréquence" value={frequency} onChange={(e) => setFrequency(e.target.value)} options={FREQ_OPTS} />
            <Input label="Première génération" type="date" value={nextRunDate} onChange={(e) => setNextRunDate(e.target.value)} />
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h3 className="font-bold text-gray-900">Prestations</h3>
          {items.map((item, idx) => (
            <div key={item.id} className="p-3 bg-gray-50 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">Ligne {idx + 1}</span>
                {items.length > 1 && <button type="button" onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}
              </div>
              <Input placeholder="Description" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} />
              <div className="grid grid-cols-3 gap-2">
                <Input type="number" label="Qté" min="0" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} />
                <Input type="number" label="Prix (€)" min="0" step="0.01" value={item.unit_price} onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)} />
                <Select label="TVA" value={String(item.vat_rate)} onChange={(e) => updateItem(item.id, 'vat_rate', parseFloat(e.target.value))} options={VAT_RATES} />
              </div>
            </div>
          ))}
          <button type="button" onClick={addItem} className="flex items-center gap-2 text-sm text-primary font-semibold hover:underline">
            <Plus size={16} />Ajouter une ligne
          </button>
          <div className="border-t border-gray-200 pt-3 flex justify-between font-black text-gray-900">
            <span>Total TTC</span><span>{formatCurrency(total)}</span>
          </div>
        </div>

        <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}
        <Button type="submit" className="w-full" size="lg" loading={loading}>Créer la récurrente</Button>
      </form>
    </div>
  );
}
