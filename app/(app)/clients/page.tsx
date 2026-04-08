'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useDataStore } from '@/stores/dataStore';
import { Input } from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { ImportClientsModal } from '@/components/ui/ImportClientsModal';
import {
  getInitials, downloadCSV, validateSiret, validateVatNumber, formatCurrency,
} from '@/lib/utils';
import { CompanySearch } from '@/components/ui/CompanySearch';
import {
  Plus, Search, Users, Trash2, Phone, Mail, Download,
  Building2, Globe, MapPin, FileText, TrendingUp, ChevronRight,
  Star, Clock, ArrowUpRight, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const GRADIENT_PAIRS = [
  ['#1D9E75', '#0F6E56'],
  ['#3B82F6', '#1D4ED8'],
  ['#8B5CF6', '#6D28D9'],
  ['#EF9F27', '#D97706'],
  ['#EF4444', '#DC2626'],
  ['#EC4899', '#DB2777'],
  ['#06B6D4', '#0891B2'],
  ['#10B981', '#059669'],
];

export default function ClientsPage() {
  const { clients, invoices, createClient, deleteClient } = useDataStore();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', city: '',
    postal_code: '', country: 'France', siret: '', vat_number: '', website: '',
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.city || '').toLowerCase().includes(q);
  });

  // Per-client invoice stats
  const clientStats = (clientId: string) => {
    const clientInvoices = invoices.filter((i) => i.client_id === clientId);
    const revenue = clientInvoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
    const pending = clientInvoices.filter((i) => i.status === 'sent' || i.status === 'overdue').reduce((s, i) => s + i.total, 0);
    const lastInvoice = clientInvoices.sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    return { count: clientInvoices.length, revenue, pending, lastInvoice };
  };

  const totalRevenue = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const activeClients = clients.filter((c) => invoices.some((i) => i.client_id === c.id));

  const handleExport = () => {
    downloadCSV(
      `clients-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Nom', 'Email', 'Téléphone', 'Adresse', 'Code postal', 'Ville', 'Pays', 'SIRET', 'N° TVA'],
      clients.map((c) => [c.name, c.email, c.phone, c.address, c.postal_code, c.city, c.country, c.siret, c.vat_number]),
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Clients</h1>
          <p className="text-sm text-gray-400 mt-0.5">{clients.length} client{clients.length !== 1 ? 's' : ''} enregistré{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {clients.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 border border-gray-200 px-3 py-2 rounded-xl text-sm font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-3 py-2 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <Sparkles size={14} />
            <span className="hidden sm:inline">Import IA</span>
          </button>
          <Button icon={<Plus size={16} />} onClick={() => setShowModal(true)}>
            Nouveau client
          </Button>
        </div>
      </div>

      {/* Stats */}
      {clients.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total clients</span>
              <Users size={15} className="text-gray-500" />
            </div>
            <p className="text-2xl font-black">{clients.length}</p>
            <p className="text-[11px] text-gray-500 mt-1">{activeClients.length} avec factures</p>
          </div>
          <div className="bg-primary rounded-2xl border border-primary-dark p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-primary-light/70 uppercase tracking-wider">CA encaissé</span>
              <TrendingUp size={15} className="text-primary-light/70" />
            </div>
            <p className="text-2xl font-black">{formatCurrency(totalRevenue)}</p>
            <p className="text-[11px] text-primary-light/60 mt-1">toutes factures payées</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Factures / client</span>
              <FileText size={15} className="text-gray-300" />
            </div>
            <p className="text-2xl font-black text-gray-900">
              {activeClients.length > 0 ? (invoices.length / activeClients.length).toFixed(1) : '0'}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">en moyenne</p>
          </div>
        </div>
      )}

      {/* Search + view toggle */}
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <Input
            placeholder="Rechercher par nom, email ou ville..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={15} />}
          />
        </div>
        <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white">
          <button
            onClick={() => setViewMode('grid')}
            className={cn('px-3 py-2 text-xs font-semibold transition-colors', viewMode === 'grid' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-700')}
          >
            Grille
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn('px-3 py-2 text-xs font-semibold transition-colors', viewMode === 'list' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-700')}
          >
            Liste
          </button>
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-16 px-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-gray-200" />
          </div>
          <p className="font-bold text-gray-400 text-sm">
            {search ? 'Aucun client trouvé' : 'Aucun client pour l\'instant'}
          </p>
          <p className="text-xs text-gray-300 mt-1 mb-4">
            {search ? 'Essayez d\'autres mots-clés' : 'Ajoutez vos premiers clients pour commencer à facturer'}
          </p>
          {!search && (
            <Button icon={<Plus size={14} />} onClick={() => setShowModal(true)}>
              Ajouter un client
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid view */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((client, idx) => {
            const [from, to] = GRADIENT_PAIRS[idx % GRADIENT_PAIRS.length];
            const stats = clientStats(client.id);
            return (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="bg-white rounded-2xl border border-gray-100 p-4 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-base flex-shrink-0 shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                  >
                    {getInitials(client.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate text-sm">{client.name}</p>
                    {client.email && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                        <Mail size={10} className="flex-shrink-0" />{client.email}
                      </p>
                    )}
                    {client.city && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                        <MapPin size={10} className="flex-shrink-0" />{client.city}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleDelete(client.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all flex-shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Stats row */}
                <div className="flex gap-2 pt-3 border-t border-gray-50">
                  <div className="flex-1 text-center">
                    <p className="text-sm font-black text-gray-900">{stats.count}</p>
                    <p className="text-[10px] text-gray-400">facture{stats.count !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="w-px bg-gray-100" />
                  <div className="flex-1 text-center">
                    <p className="text-sm font-black text-primary">{formatCurrency(stats.revenue)}</p>
                    <p className="text-[10px] text-gray-400">encaissé</p>
                  </div>
                  {stats.pending > 0 && (
                    <>
                      <div className="w-px bg-gray-100" />
                      <div className="flex-1 text-center">
                        <p className="text-sm font-black text-amber-500">{formatCurrency(stats.pending)}</p>
                        <p className="text-[10px] text-gray-400">en attente</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1.5">
                    {stats.count > 0 ? (
                      <span className="flex items-center gap-1 text-[10px] text-primary font-semibold">
                        <Star size={10} fill="currentColor" /> Client actif
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-300">Aucune facture</span>
                    )}
                  </div>
                  <ChevronRight size={13} className="text-gray-200 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            );
          })}

          {/* Add client card */}
          <button
            onClick={() => setShowModal(true)}
            className="rounded-2xl border-2 border-dashed border-gray-200 p-4 hover:border-primary/40 hover:bg-primary/2 transition-all group flex flex-col items-center justify-center gap-2 min-h-[140px] text-gray-400 hover:text-primary"
          >
            <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
              <Plus size={18} className="transition-transform group-hover:scale-110" />
            </div>
            <p className="text-sm font-semibold">Ajouter un client</p>
          </button>
        </div>
      ) : (
        /* List view */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                <th className="text-left px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Client</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Contact</th>
                <th className="text-center px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Factures</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">CA encaissé</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((client, idx) => {
                const [from, to] = GRADIENT_PAIRS[idx % GRADIENT_PAIRS.length];
                const stats = clientStats(client.id);
                return (
                  <tr
                    key={client.id}
                    className="hover:bg-gray-50/80 cursor-pointer transition-colors group"
                    onClick={() => window.location.href = `/clients/${client.id}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm"
                          style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                        >
                          {getInitials(client.name)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{client.name}</p>
                          {client.city && <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={9} />{client.city}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <div className="space-y-0.5">
                        {client.email && <p className="text-xs text-gray-500 flex items-center gap-1"><Mail size={10} />{client.email}</p>}
                        {client.phone && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={10} />{client.phone}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-sm font-bold text-gray-900">{stats.count}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <p className="text-sm font-bold text-primary">{formatCurrency(stats.revenue)}</p>
                      {stats.pending > 0 && <p className="text-xs text-amber-500">{formatCurrency(stats.pending)} en att.</p>}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                        <button
                          onClick={(e) => handleDelete(client.id, e)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                        <ChevronRight size={15} className="text-gray-300" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create client modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouveau client" size="lg">
        <form onSubmit={handleCreate} className="space-y-3">
          <CompanySearch
            label="Nom *"
            value={form.name}
            onChange={(v) => set('name', v)}
            onSelect={(company) => {
              set('name', company.name);
              if (company.siret) set('siret', company.siret);
              if (company.address) set('address', company.address);
              if (company.postal_code) set('postal_code', company.postal_code);
              if (company.city) set('city', company.city);
              if (company.vat_number) set('vat_number', company.vat_number);
            }}
            placeholder="Rechercher par nom ou SIRET..."
            required
          />
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
            <Input label="N° TVA intracommunautaire" placeholder="FR12345678901" value={form.vat_number} onChange={(e) => set('vat_number', e.target.value)} />
          </div>
          <Input label="Site web" placeholder="https://exemple.com" value={form.website} onChange={(e) => set('website', e.target.value)} />
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button type="submit" className="flex-1" loading={loading}>Créer le client</Button>
          </div>
        </form>
      </Modal>

      <ImportClientsModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={async (companies) => {
          for (const c of companies) {
            await createClient({
              name: c.name,
              email: c.email || '',
              phone: c.phone || '',
              address: c.address || '',
              city: c.city || '',
              postal_code: c.postal_code || '',
              country: c.country || 'France',
              siret: c.siret || '',
              vat_number: c.vat_number || '',
              website: c.website || '',
            } as any);
          }
        }}
      />
    </div>
  );
}
