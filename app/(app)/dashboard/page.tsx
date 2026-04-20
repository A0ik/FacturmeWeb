'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { useSubscription } from '@/hooks/useSubscription';
import { formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import {
  FileText, Clipboard, RefreshCw, Plus, TrendingUp,
  ArrowUpRight, Clock, AlertTriangle, Zap, ShoppingCart, Truck,
  TrendingDown, Users, Sparkles, Award, Flame, Target,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-white/10 shadow-2xl"
      >
        <p className="text-[11px] text-gray-400 font-semibold mb-2 capitalize">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <p className="text-xs font-semibold text-gray-900 dark:text-white">
              {entry.name}: <span className="font-black">{formatCurrency(entry.value)}</span>
            </p>
          </div>
        ))}
      </motion.div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { invoices, stats } = useDataStore();
  const sub = useSubscription();
  const [period, setPeriod] = useState<1 | 3 | 6 | 12>(6);

  // Streak counter for gamification

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
  const topClients = Object.values(clientMap).sort((a, b) => b.paid - a.paid).slice(0, 5);
  const maxPaid = topClients[0]?.paid || 1;

  // Recovery rate
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const totalOverdue = invoices.filter((i) => i.status === 'sent' && i.due_date && new Date(i.due_date) < new Date()).reduce((s, i) => s + i.total, 0);
  const recoveryRate = totalPaid + totalOverdue > 0 ? Math.round((totalPaid / (totalPaid + totalOverdue)) * 100) : 100;

  const COLORS = ['#1D9E75', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899'];

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        damping: 20,
        stiffness: 100,
      },
    },
  };

  // Animated progress value for recovery rate
  const progressValue = useSpring(recoveryRate, { stiffness: 50, damping: 30 });
  const progressWidth = useTransform(progressValue, (v) => `${v}%`);

  // ── Cash flow forecast (90 days) ──
  const today = new Date();
  const in90 = new Date(today); in90.setDate(in90.getDate() + 90);

  const cashFlowMonths: { key: string; label: string; toCollect: number; recurring: number; cumulative: number }[] = [];
  for (let m = 0; m < 3; m++) {
    const d = new Date(today);
    d.setMonth(d.getMonth() + m);
    const key = d.toISOString().slice(0, 7);
    cashFlowMonths.push({
      key,
      label: d.toLocaleString('fr-FR', { month: 'long', year: 'numeric' }),
      toCollect: 0,
      recurring: 0,
      cumulative: 0,
    });
  }

  invoices
    .filter((inv) => inv.document_type === 'invoice' && (inv.status === 'sent' || inv.status === 'overdue'))
    .forEach((inv) => {
      const refDate = inv.due_date || inv.issue_date || '';
      if (!refDate) return;
      const key = refDate.slice(0, 7);
      const bucket = cashFlowMonths.find((b) => b.key === key);
      if (bucket) bucket.toCollect += inv.total;
    });

  invoices
    .filter((inv) => inv.document_type === 'invoice' && (inv as any).is_recurring)
    .forEach((inv) => {
      const freq: string = (inv as any).recurring_frequency || 'monthly';
      const lastDate = new Date(inv.issue_date || inv.created_at);
      let next = new Date(lastDate);
      const freqDays = freq === 'weekly' ? 7 : freq === 'quarterly' ? 90 : 30;
      while (next <= in90) {
        next = new Date(next); next.setDate(next.getDate() + freqDays);
        if (next >= today && next <= in90) {
          const key = next.toISOString().slice(0, 7);
          const bucket = cashFlowMonths.find((b) => b.key === key);
          if (bucket) bucket.recurring += inv.total;
        }
      }
    });

  let cumul = 0;
  cashFlowMonths.forEach((b) => {
    cumul += b.toCollect + b.recurring;
    b.cumulative = cumul;
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 relative"
    >
      {/* Ambient glow effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/[0.02] dark:bg-primary/[0.03] rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-blue-500/[0.02] dark:bg-blue-500/[0.03] rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[300px] h-[300px] bg-purple-500/[0.02] dark:bg-purple-500/[0.03] rounded-full blur-3xl" />
      </div>

      {/* ── Header ── */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 dark:text-gray-500 text-sm font-medium flex items-center gap-2">
            <Sparkles size={14} className="text-primary animate-pulse" />
            {greeting} 👋
          </p>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">
            {profile?.company_name || 'Mon entreprise'}
          </h1>
        </div>
        <Link
          href="/invoices/new"
          className="group inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 active:scale-95"
        >
          <Plus size={16} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-300" />
          Nouveau
        </Link>
      </motion.div>

      {/* ── Paywall hint ── */}
      {sub.isFree && sub.invoiceCount >= 2 && (
        <motion.div
          variants={itemVariants}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <Link
            href="/paywall"
            className="group flex items-center gap-3 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 dark:from-amber-500/10 dark:via-yellow-500/5 dark:to-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-3.5 hover:border-amber-300 dark:hover:border-amber-500/50 transition-all hover:shadow-lg hover:shadow-amber-500/10"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
              <Zap size={18} className="text-white fill-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-amber-700 dark:text-amber-400 font-bold flex-1">
                {sub.isAtLimit ? 'Limite atteinte — Passez à Solo pour continuer' : `Plan Discovery · ${sub.invoiceCount}/5 factures ce mois`}
              </p>
            </div>
            <ArrowUpRight size={18} className="text-amber-500 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      )}

      {/* ── Stats grid ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* CA ce mois — highlight card */}
        <div className="col-span-2 lg:col-span-1 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary-dark rounded-2xl" />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-white/5 rounded-full blur-xl" />
          </div>
          <div className="relative p-5 text-white h-full flex flex-col justify-between">
            <div>
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <TrendingUp size={11} />
                CA ce mois
              </p>
              <motion.p
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="text-3xl font-black tracking-tight"
              >
                {formatCurrency(stats?.mrr || 0)}
              </motion.p>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/60 mt-3">
              <div className="flex items-center gap-1">
                <Award size={11} />
                <span>+12.5% vs mois dernier</span>
              </div>
            </div>
          </div>
        </div>

        {/* En attente */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md hover:shadow-blue-500/5 transition-all duration-300 group"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wide">En attente</p>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock size={14} className="text-blue-500" />
            </div>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-black text-gray-900 dark:text-white"
          >
            {stats?.pendingCount || 0}
          </motion.p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatCurrency(stats?.pendingRevenue || 0)}</p>
        </motion.div>

        {/* En retard */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className={`rounded-2xl p-5 border shadow-sm transition-all duration-300 group ${
            stats?.overdueCount
              ? 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-500/10 dark:to-orange-500/5 border-red-100 dark:border-red-500/20 hover:shadow-lg hover:shadow-red-500/10'
              : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-white/10 hover:shadow-md'
          }`}>
          <div className="flex items-center justify-between mb-2">
            <p className={`text-xs font-semibold uppercase tracking-wide ${stats?.overdueCount ? 'text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
              En retard
            </p>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${stats?.overdueCount ? 'bg-red-100 dark:bg-red-500/20 group-hover:scale-110' : 'bg-gray-50 dark:bg-white/10'} transition-transform`}>
              <AlertTriangle size={14} className={stats?.overdueCount ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'} />
            </div>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={`text-2xl font-black ${stats?.overdueCount ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}
          >
            {stats?.overdueCount || 0}
          </motion.p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">factures</p>
        </motion.div>

        {/* Total encaissé */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md hover:shadow-primary/5 transition-all duration-300 group"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wide">Encaissé</p>
            <div className="w-8 h-8 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ArrowUpRight size={14} className="text-primary" />
            </div>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-black text-gray-900 dark:text-white"
          >
            {formatCurrency(stats?.totalRevenue || 0)}
          </motion.p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">total</p>
        </motion.div>
      </motion.div>

      {/* ── Quick actions ── */}
      <motion.div variants={itemVariants} className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-white/10 shadow-lg p-5 sm:p-6">
        <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-4 flex items-center gap-2">
          <Sparkles size={14} className="text-primary" />
          Créer rapidement
        </p>
        <div className="grid grid-cols-5 gap-3 sm:gap-4">
          {[
            { href: '/invoices/new?type=invoice',        icon: FileText,     label: 'Facture',   hoverBg: 'hover:from-primary hover:to-primary-dark',   iconBg: 'bg-primary/10',  iconColor: 'text-primary' },
            { href: '/invoices/new?type=quote',          icon: Clipboard,    label: 'Devis',     hoverBg: 'hover:from-blue-500 hover:to-blue-600',  iconBg: 'bg-blue-50',     iconColor: 'text-blue-500' },
            { href: '/invoices/new?type=credit_note',    icon: RefreshCw,    label: 'Avoir',     hoverBg: 'hover:from-purple-500 hover:to-purple-600', iconBg: 'bg-purple-50',  iconColor: 'text-purple-500' },
            { href: '/invoices/new?type=purchase_order', icon: ShoppingCart, label: 'Bon cde',   hoverBg: 'hover:from-orange-500 hover:to-orange-600', iconBg: 'bg-orange-50',  iconColor: 'text-orange-500' },
            { href: '/invoices/new?type=delivery_note',  icon: Truck,        label: 'Bon liv.',  hoverBg: 'hover:from-cyan-500 hover:to-cyan-600',  iconBg: 'bg-cyan-50',     iconColor: 'text-cyan-500' },
          ].map(({ href, icon: Icon, label, hoverBg, iconBg, iconColor }) => (
            <Link
              key={href}
              href={href}
              className="group relative flex flex-col items-center gap-3 p-4 sm:p-5 rounded-xl bg-gray-50 dark:bg-white/5 bg-gradient-to-b hover:from-primary hover:to-primary-dark hover:text-white transition-all duration-300 hover:scale-105 hover:shadow-xl overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_ease-in-out]" />
              <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-sm bg-gray-50 group-hover:bg-white/20">
                <Icon size={20} className="text-primary group-hover:text-white transition-colors" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-white transition-colors whitespace-nowrap">{label}</span>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* ── Chart ── */}
      <motion.div variants={itemVariants} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-4 sm:p-5 overflow-x-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              Évolution mensuelle
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Facturé vs encaissé</p>
          </div>
          <div className="flex gap-1 bg-gray-50 dark:bg-white/5 rounded-xl p-1">
            {([1, 3, 6, 12] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                  period === p
                    ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-white/10'
                }`}
              >
                {p}M
              </button>
            ))}
          </div>
        </div>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={4} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="paid" name="Payé" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="#1D9E75" />
                ))}
              </Bar>
              <Bar dataKey="pending" name="En attente" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="#EF9F27" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ── Insights row ── */}
      {topClients.length > 0 && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recovery rate */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">Taux de recouvrement</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Payé vs impayé</p>
              </div>
              <motion.p
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className={`text-4xl font-black ${recoveryRate >= 80 ? 'text-primary' : 'text-amber-500'}`}
              >
                {recoveryRate}%
              </motion.p>
            </div>
            <div className="h-3 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
              <motion.div
                style={{ width: progressWidth }}
                className={`h-full rounded-full ${recoveryRate >= 80 ? 'bg-gradient-to-r from-primary to-primary-dark' : 'bg-gradient-to-r from-amber-400 to-amber-500'} shadow-[0_0_8px_rgba(0,0,0,0.1)]`}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-400 dark:text-gray-500">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Top clients (compact) */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-4 flex items-center gap-2">
              <Users size={14} className="text-primary" />
              Top clients
            </h3>
            <div className="space-y-3">
              {topClients.slice(0, 3).map((c, i) => (
                <motion.div
                  key={c.id || c.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 group cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg p-1 -mx-1 transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: COLORS[i] + '20', color: COLORS[i] }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{c.name}</p>
                    <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden mt-1">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(c.paid / maxPaid) * 100}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: COLORS[i] }}
                      />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color: COLORS[i] }}>{formatCurrency(c.paid)}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{c.count} fact.</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Cash Flow Forecast (90 days) ── */}
      {cashFlowMonths.some((b) => b.toCollect > 0 || b.recurring > 0) && (
        <motion.div variants={itemVariants} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-primary" />
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white text-sm">Trésorerie prévisionnelle</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Projections sur 90 jours</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wide border-b border-gray-100 dark:border-white/10">
                  <th className="text-left pb-3 font-semibold">Mois</th>
                  <th className="text-right pb-3 font-semibold">À encaisser</th>
                  <th className="text-right pb-3 font-semibold">Récurrents prévus</th>
                  <th className="text-right pb-3 font-semibold">Total mois</th>
                  <th className="text-right pb-3 font-semibold">Cumulatif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {cashFlowMonths.map((b) => {
                  const monthTotal = b.toCollect + b.recurring;
                  return (
                    <tr key={b.key} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 font-semibold text-gray-900 dark:text-white capitalize">{b.label}</td>
                      <td className="py-3 text-right">
                        {b.toCollect > 0 ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full text-xs">
                            +{formatCurrency(b.toCollect)}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        {b.recurring > 0 ? (
                          <span className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full text-xs">
                            +{formatCurrency(b.recurring)}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 text-right font-bold text-gray-900 dark:text-white">
                        {monthTotal > 0 ? formatCurrency(monthTotal) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </td>
                      <td className="py-3 text-right">
                        <span className={`font-bold ${b.cumulative > 0 ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`}>
                          {formatCurrency(b.cumulative)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 dark:border-white/10 text-[11px] text-gray-400 dark:text-gray-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0" />
              À encaisser (envoyées / en retard)
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 flex-shrink-0" />
              Récurrents prévus
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Top 5 Clients (detailed) ── */}
      {topClients.length > 0 && (
        <motion.div variants={itemVariants} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-primary" />
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white text-sm">Top 5 clients</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Par chiffre d'affaires encaissé</p>
            </div>
          </div>
          <div className="space-y-3">
            {topClients.map((c, i) => {
              const initials = c.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
              const pct = Math.round((c.paid / maxPaid) * 100);
              return (
                <motion.div
                  key={c.id || c.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 group cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg p-2 -mx-2 transition-colors"
                >
                  <span className="text-xs font-black text-gray-300 dark:text-gray-600 w-4 text-center flex-shrink-0 group-hover:text-primary transition-colors">#{i + 1}</span>
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: COLORS[i % COLORS.length] + '20', color: COLORS[i % COLORS.length] }}
                  >
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{c.name}</p>
                    <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden mt-1">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: i * 0.05 }}
                        className="h-full rounded-full transition-all duration-700"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(c.paid)}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">{c.count} facture{c.count !== 1 ? 's' : ''}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Recent invoices ── */}
      <motion.div variants={itemVariants} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/10">
          <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText size={14} className="text-primary" />
            Documents récents
          </h2>
          <Link href="/invoices" className="text-xs font-bold text-primary hover:underline flex items-center gap-1 group">
            Tout voir <ArrowUpRight size={11} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="text-center py-12 px-4">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3"
            >
              <FileText size={28} className="text-gray-300 dark:text-gray-600" />
            </motion.div>
            <p className="font-semibold text-gray-400 dark:text-gray-500 text-sm">Aucune facture</p>
            <p className="text-xs text-gray-300 dark:text-gray-600 mt-1 mb-4">Créez votre première facture pour commencer</p>
            <Link
              href="/invoices/new"
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-primary to-primary-dark text-white text-xs font-bold px-4 py-2 rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all hover:scale-105 active:scale-95"
            >
              <Plus size={13} />
              Créer une facture
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-white/5">
            <AnimatePresence>
              {recentInvoices.map((inv, i) => (
                <motion.div
                  key={inv.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <Link
                    href={`/invoices/${inv.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 group-hover:bg-white dark:group-hover:bg-white/10 flex items-center justify-center flex-shrink-0 transition-colors border border-gray-100 dark:border-white/10 group-hover:scale-110">
                      <FileText size={16} className="text-gray-400 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">
                        {inv.client?.name || inv.client_name_override || 'Sans client'}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{inv.number}</p>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-1">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(inv.total)}</p>
                      <StatusBadge status={inv.status} />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
