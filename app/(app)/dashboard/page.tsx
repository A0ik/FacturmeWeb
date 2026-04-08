'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useSubscription } from '@/hooks/useSubscription';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import {
  FileText, Clipboard, RefreshCw, Plus, TrendingUp,
  ArrowUpRight, Clock, AlertTriangle, Zap, ShoppingCart, Truck,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { invoices, stats } = useDataStore();
  const sub = useSubscription();
  const [period, setPeriod] = useState<1 | 3 | 6 | 12>(6);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const recentInvoices = invoices.slice(0, 5);

  // Monthly chart data
  const chartData = Array.from({ length: period }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (period - 1 - i));
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleString('fr-FR', { month: 'short' });
    return { label, key, paid: 0, pending: 0 };
  });

  invoices
    .filter((inv) => inv.document_type === 'invoice' || !inv.document_type)
    .forEach((inv) => {
      const refDate = inv.paid_at || inv.issue_date || inv.created_at;
      if (!refDate) return;
      const key = refDate.slice(0, 7);
      const entry = chartData.find((d) => d.key === key);
      if (!entry) return;
      if (inv.status === 'paid') entry.paid += inv.total;
      else if (inv.status === 'sent' || inv.status === 'draft') entry.pending += inv.total;
    });

  // Top clients
  const clientMap: Record<string, { name: string; id: string; paid: number; count: number }> = {};
  invoices.filter((inv) => inv.status === 'paid').forEach((inv) => {
    const name = inv.client?.name || inv.client_name_override || 'Sans nom';
    const id = inv.client_id || name;
    if (!clientMap[id]) clientMap[id] = { name, id: inv.client_id || '', paid: 0, count: 0 };
    clientMap[id].paid += inv.total;
    clientMap[id].count += 1;
  });
  const topClients = Object.values(clientMap).sort((a, b) => b.paid - a.paid).slice(0, 3);
  const maxPaid = topClients[0]?.paid || 1;

  // Recovery rate
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const totalOverdue = invoices.filter((i) => i.status === 'sent' && i.due_date && new Date(i.due_date) < new Date()).reduce((s, i) => s + i.total, 0);
  const recoveryRate = totalPaid + totalOverdue > 0 ? Math.round((totalPaid / (totalPaid + totalOverdue)) * 100) : 100;

  const COLORS = ['#1D9E75', '#3B82F6', '#8B5CF6'];

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium">{greeting} 👋</p>
          <h1 className="text-2xl font-black text-gray-900 mt-0.5">
            {profile?.company_name || 'Mon entreprise'}
          </h1>
        </div>
        <Link
          href="/invoices/new"
          className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-gray-900/10"
        >
          <Plus size={15} strokeWidth={2.5} />
          Nouveau
        </Link>
      </div>

      {/* ── Paywall hint ── */}
      {sub.isFree && sub.invoiceCount >= 2 && (
        <Link
          href="/paywall"
          className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-3.5 hover:border-amber-300 transition-all"
        >
          <Zap size={16} className="text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700 font-semibold flex-1">
            {sub.isAtLimit ? 'Limite atteinte — Passez à Pro pour continuer' : `Plan gratuit · ${sub.invoiceCount}/3 factures`}
          </p>
          <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full whitespace-nowrap">
            Voir les plans →
          </span>
        </Link>
      )}

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* CA ce mois — highlight card */}
        <div className="col-span-2 lg:col-span-1 relative overflow-hidden bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-5 text-white">
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/5 rounded-full" />
          <div className="absolute -bottom-3 -left-3 w-16 h-16 bg-white/5 rounded-full" />
          <p className="text-xs text-white/60 font-semibold uppercase tracking-wide mb-2">CA ce mois</p>
          <p className="text-3xl font-black tracking-tight">{formatCurrency(stats?.mrr || 0)}</p>
          <div className="flex items-center gap-1 mt-2 text-xs text-white/60">
            <TrendingUp size={11} />
            Chiffre d&apos;affaires
          </div>
        </div>

        {/* En attente */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">En attente</p>
            <div className="w-7 h-7 rounded-xl bg-blue-50 flex items-center justify-center">
              <Clock size={13} className="text-blue-500" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900">{stats?.pendingCount || 0}</p>
          <p className="text-xs text-gray-400 mt-1">{formatCurrency(stats?.pendingRevenue || 0)}</p>
        </div>

        {/* En retard */}
        <div className={`rounded-2xl p-5 border shadow-sm ${
          stats?.overdueCount
            ? 'bg-red-50 border-red-100'
            : 'bg-white border-gray-100'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <p className={`text-xs font-semibold uppercase tracking-wide ${stats?.overdueCount ? 'text-red-400' : 'text-gray-400'}`}>
              En retard
            </p>
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${stats?.overdueCount ? 'bg-red-100' : 'bg-gray-50'}`}>
              <AlertTriangle size={13} className={stats?.overdueCount ? 'text-red-500' : 'text-gray-400'} />
            </div>
          </div>
          <p className={`text-2xl font-black ${stats?.overdueCount ? 'text-red-600' : 'text-gray-900'}`}>
            {stats?.overdueCount || 0}
          </p>
          <p className="text-xs text-gray-400 mt-1">factures</p>
        </div>

        {/* Total encaissé */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Encaissé</p>
            <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center">
              <ArrowUpRight size={13} className="text-primary" />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900">{formatCurrency(stats?.totalRevenue || 0)}</p>
          <p className="text-xs text-gray-400 mt-1">total</p>
        </div>
      </div>

      {/* ── Quick actions ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Créer rapidement</p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          {[
            { href: '/invoices/new?type=invoice',        icon: FileText,     label: 'Facture',   hoverBg: 'hover:bg-primary',   iconBg: 'bg-primary/10',  iconColor: 'text-primary' },
            { href: '/invoices/new?type=quote',          icon: Clipboard,    label: 'Devis',     hoverBg: 'hover:bg-blue-500',  iconBg: 'bg-blue-50',     iconColor: 'text-blue-500' },
            { href: '/invoices/new?type=credit_note',    icon: RefreshCw,    label: 'Avoir',     hoverBg: 'hover:bg-purple-500', iconBg: 'bg-purple-50',  iconColor: 'text-purple-500' },
            { href: '/invoices/new?type=purchase_order', icon: ShoppingCart, label: 'Bon cde',   hoverBg: 'hover:bg-orange-500', iconBg: 'bg-orange-50',  iconColor: 'text-orange-500' },
            { href: '/invoices/new?type=delivery_note',  icon: Truck,        label: 'Bon liv.',  hoverBg: 'hover:bg-cyan-500',  iconBg: 'bg-cyan-50',     iconColor: 'text-cyan-500' },
          ].map(({ href, icon: Icon, label, hoverBg, iconBg, iconColor }) => (
            <Link
              key={href}
              href={href}
              className={`group flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-50 ${hoverBg} hover:text-white transition-all duration-200 flex-shrink-0 min-w-[72px]`}
            >
              <div className={`w-9 h-9 rounded-xl ${iconBg} group-hover:bg-white/20 flex items-center justify-center transition-colors`}>
                <Icon size={17} className={`${iconColor} group-hover:text-white transition-colors`} />
              </div>
              <span className="text-xs font-bold text-gray-700 group-hover:text-white transition-colors whitespace-nowrap">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-gray-900">Évolution mensuelle</h2>
            <p className="text-xs text-gray-400 mt-0.5">Facturé vs encaissé</p>
          </div>
          <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
            {([1, 3, 6, 12] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {p}M
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barGap={3} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
            />
            <Tooltip
              formatter={(v: any) => formatCurrency(v)}
              labelStyle={{ fontWeight: 700, fontSize: 12 }}
              contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
            />
            <Bar dataKey="paid" name="Payé" fill="#1D9E75" radius={[5, 5, 0, 0]} />
            <Bar dataKey="pending" name="En attente" fill="#EF9F27" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Insights row ── */}
      {topClients.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recovery rate */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Taux de recouvrement</h3>
                <p className="text-xs text-gray-400 mt-0.5">Payé vs impayé</p>
              </div>
              <p className={`text-4xl font-black ${recoveryRate >= 80 ? 'text-primary' : 'text-amber-500'}`}>
                {recoveryRate}%
              </p>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${recoveryRate >= 80 ? 'bg-gradient-to-r from-primary to-primary-dark' : 'bg-gradient-to-r from-amber-400 to-amber-500'}`}
                style={{ width: `${recoveryRate}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Top clients */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 text-sm mb-4">Top clients</h3>
            <div className="space-y-3.5">
              {topClients.map((c, i) => (
                <div key={c.id || c.name} className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{ backgroundColor: COLORS[i] + '20', color: COLORS[i] }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${(c.paid / maxPaid) * 100}%`, backgroundColor: COLORS[i] }}
                      />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color: COLORS[i] }}>{formatCurrency(c.paid)}</p>
                    <p className="text-xs text-gray-400">{c.count} fact.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Recent invoices ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h2 className="font-bold text-gray-900">Documents récents</h2>
          <Link href="/invoices" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
            Tout voir <ArrowUpRight size={11} />
          </Link>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <FileText size={24} className="text-gray-300" />
            </div>
            <p className="font-semibold text-gray-400 text-sm">Aucune facture</p>
            <p className="text-xs text-gray-300 mt-1 mb-4">Créez votre première facture pour commencer</p>
            <Link
              href="/invoices/new"
              className="inline-flex items-center gap-1.5 bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-primary-dark transition-colors"
            >
              <Plus size={13} />
              Créer une facture
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentInvoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors group"
              >
                <div className="w-8 h-8 rounded-xl bg-gray-50 group-hover:bg-white flex items-center justify-center flex-shrink-0 transition-colors border border-gray-100">
                  <FileText size={14} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {inv.client?.name || inv.client_name_override || 'Sans client'}
                  </p>
                  <p className="text-xs text-gray-400">{inv.number}</p>
                </div>
                <div className="text-right flex-shrink-0 space-y-1">
                  <p className="text-sm font-bold text-gray-900">{formatCurrency(inv.total)}</p>
                  <StatusBadge status={inv.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
