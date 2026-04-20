'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
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
  Star, Sparkles, Grid3X3, List, LayoutGrid, ArrowUpRight,
  Eye, EyeOff, Filter, X, Calendar, DollarSign, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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

// Glassmorphism Card Component
const GlassCard = ({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className={cn(
      'relative bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl overflow-hidden',
      'shadow-lg shadow-primary/5 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300',
      className
    )}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
    {children}
  </motion.div>
);

// Animated Stat Card
const StatCard = ({
  title, value, subtitle, icon: Icon, gradient, delay,
}: { title: string; value: string | number; subtitle: string; icon: any; gradient: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.4, delay }}
    className={cn(
      'relative overflow-hidden rounded-3xl p-6 border border-white/20 dark:border-white/10',
      'bg-gradient-to-br backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300',
      gradient
    )}
  >
    {/* Animated background pattern */}
    <div className="absolute inset-0 opacity-[0.05]">
      <div className="absolute inset-0" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />
    </div>

    <div className="relative">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-2xl bg-white/20 dark:bg-white/10 backdrop-blur-sm">
          <Icon size={20} className="text-white dark:text-white/90" />
        </div>
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          className="text-white/30"
        >
          <Activity size={24} />
        </motion.div>
      </div>
      <p className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-1">{title}</p>
      <p className="text-3xl font-black text-white mb-1">{value}</p>
      <p className="text-xs text-white/60">{subtitle}</p>
    </div>
  </motion.div>
);

// Client Card Component
const ClientCard = ({ client, stats, idx, onDelete, viewMode }: {
  client: any;
  stats: any;
  idx: number;
  onDelete: (e: React.MouseEvent) => void;
  viewMode: 'grid' | 'list';
}) => {
  const [from, to] = GRADIENT_PAIRS[idx % GRADIENT_PAIRS.length];

  if (viewMode === 'list') {
    return (
      <motion.tr
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: idx * 0.05 }}
        className="hover:bg-primary/5 cursor-pointer transition-colors group"
        onClick={() => window.location.href = `/clients/${client.id}`}
      >
        <td className="px-5 py-4">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg"
              style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
            >
              {getInitials(client.name)}
            </motion.div>
            <div>
              <p className="text-sm font-bold text-gray-900">{client.name}</p>
              {client.city && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <MapPin size={9} />{client.city}
                </p>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-4">
          <div className="space-y-1">
            {client.email && (
              <p className="text-xs text-gray-600 flex items-center gap-1">
                <Mail size={10} className="text-gray-400" />{client.email}
              </p>
            )}
            {client.phone && (
              <p className="text-xs text-gray-600 flex items-center gap-1">
                <Phone size={10} className="text-gray-400" />{client.phone}
              </p>
            )}
          </div>
        </td>
        <td className="px-4 py-4 text-center">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
            {stats.count}
          </span>
        </td>
        <td className="px-4 py-4 text-right">
          <p className="text-sm font-bold text-primary">{formatCurrency(stats.revenue)}</p>
          {stats.pending > 0 && (
            <p className="text-xs text-amber-600 font-medium">{formatCurrency(stats.pending)} en att.</p>
          )}
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(e); }}
              className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
            >
              <Trash2 size={14} />
            </button>
            <ChevronRight size={16} className="text-gray-300 group-hover:text-primary transition-colors" />
          </div>
        </td>
      </motion.tr>
    );
  }

  return (
    <Link href={`/clients/${client.id}`} className="block">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: idx * 0.05 }}
        whileHover={{ y: -4 }}
        className="group relative"
      >
        {/* Glow effect on hover */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <GlassCard className="relative p-5 cursor-pointer">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <motion.div
              whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
              transition={{ duration: 0.5 }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
            >
              {getInitials(client.name)}
            </motion.div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 truncate text-base group-hover:text-primary transition-colors">{client.name}</h3>
              {client.email && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1 truncate">
                  <Mail size={11} className="flex-shrink-0 text-gray-400" />{client.email}
                </p>
              )}
              {client.city && (
                <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                  <MapPin size={11} className="flex-shrink-0 text-gray-400" />{client.city}
                </p>
              )}
            </div>
            <button
              onClick={(e) => { e.preventDefault(); onDelete(e); }}
              className="opacity-0 group-hover:opacity-100 p-2 rounded-xl hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all flex-shrink-0"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900/50">
              <p className="text-lg font-black text-gray-900">{stats.count}</p>
              <p className="text-[10px] text-gray-500 font-medium">Facture{stats.count !== 1 ? 's' : ''}</p>
            </div>
            <div className="text-center p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5">
              <p className="text-lg font-black text-primary">{formatCurrency(stats.revenue)}</p>
              <p className="text-[10px] text-gray-500 font-medium">Encaissé</p>
            </div>
            {stats.pending > 0 ? (
              <div className="text-center p-3 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20">
                <p className="text-lg font-black text-amber-600">{formatCurrency(stats.pending)}</p>
                <p className="text-[10px] text-gray-500 font-medium">En attente</p>
              </div>
            ) : (
              <div className="text-center p-3 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
                <p className="text-lg font-black text-green-600">✓</p>
                <p className="text-[10px] text-gray-500 font-medium">À jour</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-1.5">
              {stats.count > 0 ? (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold"
                >
                  <Star size={8} fill="currentColor" /> Client actif
                </motion.span>
              ) : (
                <span className="text-[10px] text-gray-400 px-2.5 py-1">Nouveau client</span>
              )}
            </div>
            <motion.div
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
              className="text-gray-300 group-hover:text-primary transition-colors"
            >
              <ArrowUpRight size={16} />
            </motion.div>
          </div>
        </GlassCard>
      </motion.div>
    </Link>
  );
};

export default function ClientsPage() {
  const router = useRouter();
  const { clients, invoices, createClient, bulkCreateClients, deleteClient } = useDataStore();
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
      toast.success('Client créé avec succès');
      setForm({ name: '', email: '', phone: '', address: '', city: '', postal_code: '', country: 'France', siret: '', vat_number: '', website: '' });
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const client = clients.find((c) => c.id === id);
    toast('Supprimer ce client ?', {
      description: client?.name,
      action: {
        label: 'Supprimer',
        onClick: () => deleteClient(id).then(() => toast.success('Client supprimé')).catch((err: any) => toast.error(err.message)),
      },
    });
  };

  return (
    <div className="space-y-8">
      {/* Animated Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl font-black text-gray-900 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent"
          >
            Clients
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm text-gray-500 mt-1"
          >
            {clients.length} client{clients.length !== 1 ? 's' : ''} enregistré{clients.length !== 1 ? 's' : ''} · {activeClients.length} actif{activeClients.length !== 1 ? 's' : ''}
          </motion.p>
        </div>

        <div className="flex items-center gap-2">
          {clients.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExport}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 bg-white/70 backdrop-blur-sm border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all"
            >
              <Download size={15} />
              <span className="hidden sm:inline">Export</span>
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/40 transition-all"
          >
            <Sparkles size={15} />
            <span className="hidden sm:inline">Import IA</span>
          </motion.button>
          <Button icon={<Plus size={16} />} onClick={() => setShowModal(true)}>
            Nouveau client
          </Button>
        </div>
      </motion.div>

      {/* Stats Dashboard */}
      {clients.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Total clients"
            value={clients.length}
            subtitle={`${activeClients.length} avec factures`}
            icon={Users}
            gradient="from-gray-900 to-gray-800"
            delay={0}
          />
          <StatCard
            title="CA encaissé"
            value={formatCurrency(totalRevenue)}
            subtitle="toutes factures payées"
            icon={TrendingUp}
            gradient="from-primary to-primary-dark"
            delay={0.1}
          />
          <StatCard
            title="Factures / client"
            value={activeClients.length > 0 ? (invoices.length / activeClients.length).toFixed(1) : '0'}
            subtitle="en moyenne"
            icon={FileText}
            gradient="from-blue-500 to-blue-600"
            delay={0.2}
          />
        </div>
      )}

      {/* Search & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Rechercher par nom, email ou ville..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/70 backdrop-blur-xl border border-gray-200 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex rounded-2xl overflow-hidden bg-white/70 backdrop-blur-xl border border-gray-200 p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2',
              viewMode === 'grid'
                ? 'bg-primary text-white shadow-md'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            )}
          >
            <Grid3X3 size={16} />
            <span className="hidden sm:inline">Grille</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2',
              viewMode === 'list'
                ? 'bg-primary text-white shadow-md'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            )}
          >
            <List size={16} />
            <span className="hidden sm:inline">Liste</span>
          </button>
        </div>
      </motion.div>

      {/* Empty State */}
      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center py-20 px-4"
          >
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200 flex items-center justify-center mx-auto mb-6">
              <Users size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">
              {search ? 'Aucun client trouvé' : 'Votre carnet de clients vous attend'}
            </h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
              {search
                ? 'Essayez d\'autres mots-clés ou vérifiez l\'orthographe'
                : 'Commencez par ajouter votre premier client — il sera ensuite disponible en un clic lors de la création de vos factures.'}
            </p>
            {!search && (
              <Button icon={<Plus size={16} />} onClick={() => setShowModal(true)}>
                Ajouter mon premier client
              </Button>
            )}
          </motion.div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filtered.map((client, idx) => (
              <ClientCard
                key={client.id}
                client={client}
                stats={clientStats(client.id)}
                idx={idx}
                onDelete={(e) => handleDelete(client.id, e)}
                viewMode={viewMode}
              />
            ))}

            {/* Add Card */}
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: filtered.length * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowModal(true)}
              className="relative group"
            >
              <div className="h-full rounded-3xl border-2 border-dashed border-gray-300 hover:border-primary/50 p-6 transition-all group-hover:bg-primary/5 flex flex-col items-center justify-center gap-3 min-h-[220px]">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                  <Plus size={24} className="text-gray-400 group-hover:text-primary transition-colors" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-600 group-hover:text-primary transition-colors">Ajouter un client</p>
                  <p className="text-xs text-gray-400 mt-1">Créer une fiche client</p>
                </div>
              </div>
            </motion.button>
          </motion.div>
        ) : (
          /* List View */
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white/70 backdrop-blur-xl rounded-3xl border border-gray-200 shadow-lg overflow-hidden"
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="text-left px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="text-left px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Contact</th>
                  <th className="text-center px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Factures</th>
                  <th className="text-right px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">CA encaissé</th>
                  <th className="px-4 py-4" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((client, idx) => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    stats={clientStats(client.id)}
                    idx={idx}
                    onDelete={(e) => handleDelete(client.id, e)}
                    viewMode={viewMode}
                  />
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouveau client" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Email" type="email" placeholder="contact@exemple.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
            <Input label="Téléphone" placeholder="+33 6 12 34 56 78" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <Input label="Adresse" placeholder="123 rue de la Paix" value={form.address} onChange={(e) => set('address', e.target.value)} />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Code postal" placeholder="75001" value={form.postal_code} onChange={(e) => set('postal_code', e.target.value)} />
            <Input label="Ville" placeholder="Paris" value={form.city} onChange={(e) => set('city', e.target.value)} className="sm:col-span-2" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="SIRET" placeholder="12345678901234" value={form.siret} onChange={(e) => set('siret', e.target.value)} />
            <Input label="N° TVA intracommunautaire" placeholder="FR12345678901" value={form.vat_number} onChange={(e) => set('vat_number', e.target.value)} />
          </div>
          <Input label="Site web" placeholder="https://exemple.com" value={form.website} onChange={(e) => set('website', e.target.value)} />
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
            >
              <p className="text-sm text-red-600">{error}</p>
            </motion.div>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button type="submit" className="flex-1" loading={loading}>Créer le client</Button>
          </div>
        </form>
      </Modal>

      <ImportClientsModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={async (companies) => {
          await bulkCreateClients(companies.map((c) => ({
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
          } as any)));
          toast.success(`${companies.length} client(s) importé(s)`);
        }}
      />
    </div>
  );
}
