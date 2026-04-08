'use client';
import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';
import Header from '@/components/layout/Header';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { formatCurrency, formatDateShort, getInitials } from '@/lib/utils';
import { getSupabaseClient } from '@/lib/supabase';
import { Pencil, Trash2, FileText, Plus, Tag, MessageSquare, X } from 'lucide-react';

const TAG_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700',
  'bg-amber-100 text-amber-700',
  'bg-pink-100 text-pink-700',
  'bg-cyan-100 text-cyan-700',
  'bg-orange-100 text-orange-700',
  'bg-indigo-100 text-indigo-700',
];

interface ClientNote {
  id: string;
  client_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { clients, invoices, updateClient, deleteClient } = useDataStore();
  const { user } = useAuthStore();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  // Tags state
  const [tagInput, setTagInput] = useState('');
  const [savingTags, setSavingTags] = useState(false);

  // Notes state
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(true);

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

  // Fetch notes on mount
  useEffect(() => {
    const fetchNotes = async () => {
      setLoadingNotes(true);
      try {
        const { data, error } = await getSupabaseClient()
          .from('client_notes')
          .select('*')
          .eq('client_id', id)
          .order('created_at', { ascending: false });
        if (!error && data) setNotes(data);
      } catch (e) {
        // silently fail
      } finally {
        setLoadingNotes(false);
      }
    };
    fetchNotes();
  }, [id]);

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

  // Tag handlers
  const handleAddTag = async (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    const currentTags: string[] = (client as any).tags || [];
    if (currentTags.includes(trimmed)) { setTagInput(''); return; }
    const newTags = [...currentTags, trimmed];
    setSavingTags(true);
    try {
      await updateClient(id, { tags: newTags } as any);
    } catch (e: any) { alert(e.message); }
    finally { setSavingTags(false); setTagInput(''); }
  };

  const handleRemoveTag = async (tag: string) => {
    const currentTags: string[] = (client as any).tags || [];
    const newTags = currentTags.filter((t) => t !== tag);
    setSavingTags(true);
    try {
      await updateClient(id, { tags: newTags } as any);
    } catch (e: any) { alert(e.message); }
    finally { setSavingTags(false); }
  };

  // Note handlers
  const handleAddNote = async () => {
    const content = noteInput.trim();
    if (!content || !user) return;
    setAddingNote(true);
    try {
      const { data, error } = await getSupabaseClient()
        .from('client_notes')
        .insert({ client_id: id, user_id: user.id, content })
        .select()
        .single();
      if (error) throw new Error(error.message);
      setNotes((prev) => [data, ...prev]);
      setNoteInput('');
    } catch (e: any) { alert(e.message); }
    finally { setAddingNote(false); }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const { error } = await getSupabaseClient()
        .from('client_notes')
        .delete()
        .eq('id', noteId);
      if (error) throw new Error(error.message);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (e: any) { alert(e.message); }
  };

  const clientTags: string[] = (client as any).tags || [];

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

      {/* Tags */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Tag size={15} className="text-gray-400" />
          <h3 className="font-bold text-gray-900">Tags</h3>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {clientTags.length === 0 && (
            <p className="text-xs text-gray-400">Aucun tag. Ajoutez-en ci-dessous.</p>
          )}
          {clientTags.map((tag, i) => (
            <button
              key={tag}
              onClick={() => handleRemoveTag(tag)}
              disabled={savingTags}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity hover:opacity-70 ${TAG_COLORS[i % TAG_COLORS.length]}`}
              title="Cliquer pour supprimer"
            >
              {tag}
              <X size={11} />
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(tagInput); } }}
            placeholder="Nouveau tag... (Entrée pour ajouter)"
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
          <button
            onClick={() => handleAddTag(tagInput)}
            disabled={!tagInput.trim() || savingTags}
            className="px-3 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-40"
          >
            <Plus size={14} />
          </button>
        </div>
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

      {/* Notes timeline */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare size={15} className="text-gray-400" />
          <h3 className="font-bold text-gray-900">Notes & suivi</h3>
        </div>

        {/* Add note */}
        <div className="space-y-2 mb-5">
          <textarea
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Ajouter une note ou un suivi..."
            rows={3}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all resize-none"
          />
          <Button
            onClick={handleAddNote}
            loading={addingNote}
            disabled={!noteInput.trim()}
            size="sm"
            icon={<Plus size={14} />}
          >
            Ajouter une note
          </Button>
        </div>

        {/* Notes list */}
        {loadingNotes ? (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-6">
            <MessageSquare size={24} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Aucune note pour ce client</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="flex gap-3 group">
                {/* Date column */}
                <div className="flex-shrink-0 w-20 pt-1">
                  <p className="text-[10px] font-semibold text-gray-400 leading-tight">
                    {new Date(note.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                  </p>
                  <p className="text-[10px] text-gray-300">
                    {new Date(note.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {/* Vertical line */}
                <div className="flex-shrink-0 flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-primary/40 mt-1.5" />
                  <div className="w-px flex-1 bg-gray-100 mt-1" />
                </div>
                {/* Content */}
                <div className="flex-1 pb-2">
                  <div className="bg-gray-50 rounded-xl p-3 relative">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                      title="Supprimer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
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
