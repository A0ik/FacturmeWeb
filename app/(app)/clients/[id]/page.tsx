'use client';
import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDataStore } from '@/stores/dataStore';
import Header from '@/components/layout/Header';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { formatCurrency, formatDateShort, getInitials } from '@/lib/utils';
import { Pencil, Trash2, FileText, Plus } from 'lucide-react';

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { clients, invoices, updateClient, deleteClient } = useDataStore();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  const client = clients.find((c) => c.id === id);
  if (!client) return (
    <div className="text-center py-20">
      <p className="text-gray-500">Client introuvable</p>
      <Link href="/clients" className="mt-3 text-primary font-semibold text-sm hover:underline block">Retour</Link>
    </div>
  );

  const clientInvoices = invoices.filter((inv) => inv.client_id === id);
  const totalRevenue = clientInvoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);

  const [form, setForm] = useState({ name: client.name, email: client.email || '', phone: client.phone || '', address: client.address || '', city: client.city || '', postal_code: client.postal_code || '', country: client.country || 'France', siret: client.siret || '', vat_number: client.vat_number || '' });
  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await updateClient(id, form); setShowEdit(false); }
    catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    await deleteClient(id);
    router.push('/clients');
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <Header
        title={client.name}
        back="/clients"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<Pencil size={14} />} onClick={() => setShowEdit(true)}>Modifier</Button>
            <Button variant="danger" size="sm" icon={<Trash2 size={14} />} onClick={() => setShowDelete(true)}>Supprimer</Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-black text-gray-900">{clientInvoices.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Factures</p>
        </div>
        <div className="bg-primary rounded-2xl p-4 text-center">
          <p className="text-xl font-black text-white">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-primary-light/80 mt-0.5">CA encaissé</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <p className="text-2xl font-black text-gray-900">{clientInvoices.filter((i) => i.status === 'sent').length}</p>
          <p className="text-xs text-gray-400 mt-0.5">En attente</p>
        </div>
      </div>

      {/* Info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
        <h3 className="font-bold text-gray-900 mb-3">Coordonnées</h3>
        {[
          { label: 'Email', value: client.email },
          { label: 'Téléphone', value: client.phone },
          { label: 'Adresse', value: [client.address, client.postal_code, client.city].filter(Boolean).join(', ') },
          { label: 'SIRET', value: client.siret },
          { label: 'N° TVA', value: client.vat_number },
        ].map(({ label, value }) => value ? (
          <div key={label} className="flex gap-3 text-sm">
            <span className="text-gray-400 w-24 flex-shrink-0">{label}</span>
            <span className="text-gray-900 font-medium">{value}</span>
          </div>
        ) : null)}
      </div>

      {/* Invoices */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
          <h3 className="font-bold text-gray-900">Documents</h3>
          <Link href={`/invoices/new`} className="text-sm text-primary font-semibold hover:underline flex items-center gap-1">
            <Plus size={14} />Nouveau
          </Link>
        </div>
        {clientInvoices.length === 0 ? (
          <div className="text-center py-8">
            <FileText size={28} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Aucune facture</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {clientInvoices.map((inv) => (
              <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{inv.number}</p>
                  <p className="text-xs text-gray-400">{formatDateShort(inv.issue_date)}</p>
                </div>
                <div className="text-right flex-shrink-0 space-y-0.5">
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(inv.total)}</p>
                  <StatusBadge status={inv.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Modifier le client" size="lg">
        <form onSubmit={handleUpdate} className="space-y-3">
          <Input label="Nom *" value={form.name} onChange={(e) => setField('name', e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
            <Input label="Téléphone" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
          </div>
          <Input label="Adresse" value={form.address} onChange={(e) => setField('address', e.target.value)} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Code postal" value={form.postal_code} onChange={(e) => setField('postal_code', e.target.value)} />
            <Input label="Ville" value={form.city} onChange={(e) => setField('city', e.target.value)} className="col-span-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="SIRET" value={form.siret} onChange={(e) => setField('siret', e.target.value)} />
            <Input label="N° TVA" value={form.vat_number} onChange={(e) => setField('vat_number', e.target.value)} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowEdit(false)}>Annuler</Button>
            <Button type="submit" className="flex-1" loading={loading}>Enregistrer</Button>
          </div>
        </form>
      </Modal>

      {/* Delete modal */}
      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Supprimer ce client">
        <p className="text-gray-600 mb-4">Êtes-vous sûr de vouloir supprimer <strong>{client.name}</strong> ? Cette action est irréversible.</p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setShowDelete(false)}>Annuler</Button>
          <Button variant="danger" className="flex-1" onClick={handleDelete}>Supprimer</Button>
        </div>
      </Modal>
    </div>
  );
}
