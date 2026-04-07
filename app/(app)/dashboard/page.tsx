'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { FileText, Clipboard, RefreshCw, TrendingUp, Clock, AlertTriangle, Plus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function DashboardPage() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { invoices, stats } = useDataStore();
  const [period, setPeriod] = useState<1 | 3 | 6 | 12>(6);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bonne après-midi' : 'Bonsoir';
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">{greeting}</p>
          <h1 className="text-2xl font-black text-gray-900">{profile?.company_name || 'Mon entreprise'}</h1>
        </div>
        <Link href="/invoices/new" className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors shadow-sm">
          <Plus size={16} />
          Nouveau
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-primary rounded-2xl p-4 text-white">
          <p className="text-xs text-primary-light/80 font-medium mb-1">CA ce mois</p>
          <p className="text-2xl font-black">{formatCurrency(stats?.mrr || 0)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium mb-1">En attente</p>
          <p className="text-2xl font-black text-gray-900">{stats?.pendingCount || 0}</p>
          <p className="text-xs text-gray-400">{formatCurrency(stats?.pendingRevenue || 0)}</p>
        </div>
        <div className={`rounded-2xl p-4 border ${stats?.overdueCount ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
          <p className={`text-xs font-medium mb-1 ${stats?.overdueCount ? 'text-red-500' : 'text-gray-500'}`}>En retard</p>
          <p className={`text-2xl font-black ${stats?.overdueCount ? 'text-red-600' : 'text-gray-900'}`}>{stats?.overdueCount || 0}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-medium mb-1">Total encaissé</p>
          <p className="text-xl font-black text-gray-900">{formatCurrency(stats?.totalRevenue || 0)}</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <p className="text-sm font-bold text-gray-700 mb-3">Créer rapidement</p>
        <div className="grid grid-cols-3 gap-2">
          <Link href="/invoices/new?type=invoice" className="flex flex-col items-center gap-2 p-3 bg-primary rounded-xl text-white hover:bg-primary-dark transition-colors">
            <FileText size={20} />
            <span className="text-xs font-bold">Facture</span>
          </Link>
          <Link href="/invoices/new?type=quote" className="flex flex-col items-center gap-2 p-3 bg-blue-500 rounded-xl text-white hover:bg-blue-600 transition-colors">
            <Clipboard size={20} />
            <span className="text-xs font-bold">Devis</span>
          </Link>
          <Link href="/invoices/new?type=credit_note" className="flex flex-col items-center gap-2 p-3 bg-purple-500 rounded-xl text-white hover:bg-purple-600 transition-colors">
            <RefreshCw size={20} />
            <span className="text-xs font-bold">Avoir</span>
          </Link>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Évolution mensuelle</h2>
          <div className="flex gap-1">
            {([1, 3, 6, 12] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${period === p ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-100'}`}>
                {p}M
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`} />
            <Tooltip formatter={(v: any) => formatCurrency(v)} labelStyle={{ fontWeight: 700 }} contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 12 }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="paid" name="Payé" fill="#1D9E75" radius={[4, 4, 0, 0]} />
            <Bar dataKey="pending" name="En attente" fill="#EF9F27" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      {topClients.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recovery rate */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-bold text-gray-900">Taux de recouvrement</p>
                <p className="text-xs text-gray-500">Factures payées vs impayées</p>
              </div>
              <p className={`text-3xl font-black ${recoveryRate >= 80 ? 'text-primary' : 'text-yellow-500'}`}>{recoveryRate}%</p>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${recoveryRate >= 80 ? 'bg-primary' : 'bg-yellow-400'}`} style={{ width: `${recoveryRate}%` }} />
            </div>
          </div>

          {/* Top clients */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="font-bold text-gray-900 mb-3">Top clients</p>
            <div className="space-y-3">
              {topClients.map((c, i) => (
                <div key={c.id || c.name} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black" style={{ backgroundColor: COLORS[i] + '20', color: COLORS[i] }}>#{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                      <div className="h-full rounded-full" style={{ width: `${(c.paid / maxPaid) * 100}%`, backgroundColor: COLORS[i] }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: COLORS[i] }}>{formatCurrency(c.paid)}</p>
                    <p className="text-xs text-gray-400">{c.count} fact.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent invoices */}
      <div className="bg-white rounded-2xl border border-gray-100">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
          <h2 className="font-bold text-gray-900">Documents récents</h2>
          <Link href="/invoices" className="text-sm text-primary font-semibold hover:underline">Tout voir</Link>
        </div>
        {recentInvoices.length === 0 ? (
          <div className="text-center py-10 px-4">
            <FileText size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="font-semibold text-gray-400">Aucune facture</p>
            <p className="text-sm text-gray-400 mt-1">Créez votre première facture pour commencer</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentInvoices.map((inv) => (
              <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{inv.client?.name || inv.client_name_override || 'Sans client'}</p>
                  <p className="text-xs text-gray-400">{inv.number}</p>
                </div>
                <div className="text-right flex-shrink-0">
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
