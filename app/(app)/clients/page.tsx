'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useDataStore } from '@/stores/dataStore';
import { Input } from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { getInitials, SECTORS, downloadCSV, validateSiret, validateVatNumber } from '@/lib/utils';
import { Plus, Search, Users, Trash2, Phone, Mail, Download } from 'lucide-react';

export default function ClientsPage() {
  const { clients, createClient, deleteClient } = useDataStore();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', city: '', postal_code: '', country: 'France', siret: '', vat_number: '', website: '' });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
  });

  const handleExport = () => {
    downloadCSV(
      `clients-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Nom', 'Email', 'Téléphone', 'Adresse', 'Code postal', 'Ville', 'Pays', 'SIRET', 'N° TVA', 'Notes'],
      clients.map((c) => [c.name, c.email, c.phone, c.address, c.postal_code, c.city, c.country, c.siret, c.vat_number, c.notes])
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { setError('Le nom est requis'); return; }
    if (form.siret && !validateSiret(form.siret)) { setError('SIRET invalide (14 chiffres requis)'); return; }
    if (form.vat_number && !validateVatNumber(form.vat_number)) { setError('N° TVA invalide (ex: FR12345678901)'); return; }
    setLoading(true); setError('');
    try {
      await createClient(form as any);
      setShowModal(false);
      setForm({ name: '', email: '', phone: '', address: '', city: '', postal_code: '', country: 'France', siret: '', vat_number: '', website: '' });
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm('Supprimer ce client ?')) return;
    await deleteClient(id);
  };

  const COLORS = ['#1D9E75', '#3B82F6', '#8B5CF6', '#EF9F27', '#EF4444', '#EC4899'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-gray-900">Clients</h1>
        <div className="flex items-center gap-2">
          {clients.length > 0 && (
            <button onClick={handleExport} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 border border-gray-200 px-3 py-2 rounded-xl text-sm font-semibold hover:border-gray-300 transition-all" title="Exporter en CSV">
              <Download size={14} />
              <span className="hidden sm:inline">CSV</span>
            </button>
          )}
          <Button icon={<Plus size={16} />} onClick={() => setShowModal(true)}>Nouveau</Button>
        </div>
      </div>

      <Input placeholder="Rechercher un client..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search size={15} />} />

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-14">
          <Users size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="font-semibold text-gray-400">{search ? 'Aucun résultat' : 'Aucun client'}</p>
          {!search && (
            <button onClick={() => setShowModal(true)} className="mt-3 text-primary text-sm font-semibold hover:underline">
              Ajouter votre premier client
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((client, idx) => {
            const color = COLORS[idx % COLORS.length];
            return (
              <Link key={client.id} href={`/clients/${client.id}`} className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-primary/30 hover:shadow-sm transition-all group">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-base flex-shrink-0" style={{ backgroundColor: color }}>
                    {getInitials(client.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{client.name}</p>
                    {client.email && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Mail size={10} />{client.email}</p>}
                    {client.phone && <p className="text-xs text-gray-400 flex items-center gap-1"><Phone size={10} />{client.phone}</p>}
                  </div>
                  <button
                    onClick={(e) => handleDelete(client.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouveau client" size="lg">
        <form onSubmit={handleCreate} className="space-y-3">
          <Input label="Nom *" placeholder="Entreprise ou nom complet" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" placeholder="contact@exemple.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
            <Input label="Téléphone" placeholder="+33 6 12 34 56 78" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <Input label="Adresse" placeholder="123 rue de la Paix" value={form.address} onChange={(e) => set('address', e.target.value)} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Code postal" placeholder="75001" value={form.postal_code} onChange={(e) => set('postal_code', e.target.value)} />
            <Input label="Ville" placeholder="Paris" value={form.city} onChange={(e) => set('city', e.target.value)} className="col-span-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="SIRET" placeholder="12345678901234" value={form.siret} onChange={(e) => set('siret', e.target.value)} />
            <Input label="N° TVA" placeholder="FR12345678901" value={form.vat_number} onChange={(e) => set('vat_number', e.target.value)} />
          </div>
          <Input label="Site web" placeholder="https://exemple.com" value={form.website} onChange={(e) => set('website', e.target.value)} />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button type="submit" className="flex-1" loading={loading}>Créer le client</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
