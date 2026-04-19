'use client';
import { create } from 'zustand';
import { getSupabaseClient } from '@/lib/supabase';
import { Client, Invoice, InvoiceFormData, InvoiceStatus, DashboardStats, RecurringInvoice } from '@/types';
import { generateId } from '@/lib/utils';

interface DataState {
  clients: Client[]; invoices: Invoice[]; recurringInvoices: RecurringInvoice[]; loading: boolean; stats: DashboardStats | null;
  fetchClients: () => Promise<void>; createClient: (data: Omit<Client, 'id'|'user_id'|'created_at'|'updated_at'>) => Promise<Client>; bulkCreateClients: (items: Omit<Client, 'id'|'user_id'|'created_at'|'updated_at'>[]) => Promise<Client[]>; updateClient: (id: string, data: Partial<Client>) => Promise<void>; deleteClient: (id: string) => Promise<void>;
  fetchInvoices: () => Promise<void>; createInvoice: (data: InvoiceFormData, profile: any) => Promise<Invoice>; updateInvoice: (id: string, data: Partial<Invoice>) => Promise<void>; updateInvoiceStatus: (id: string, status: InvoiceStatus) => Promise<void>; deleteInvoice: (id: string) => Promise<void>; duplicateInvoice: (id: string, profile: any) => Promise<Invoice>; getNextInvoiceNumber: (prefix: string, count: number) => string;
  fetchRecurringInvoices: () => Promise<void>; createRecurringInvoice: (data: Omit<RecurringInvoice, 'id'|'user_id'|'created_at'|'updated_at'>) => Promise<RecurringInvoice>; updateRecurringInvoice: (id: string, data: Partial<RecurringInvoice>) => Promise<void>; deleteRecurringInvoice: (id: string) => Promise<void>;
  computeStats: () => void; clearData: () => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  clients: [], invoices: [], recurringInvoices: [], loading: false, stats: null,
  clearData: () => set({ clients: [], invoices: [], recurringInvoices: [], stats: null }),

  fetchClients: async () => {
    set({ loading: true });
    try { const { data } = await getSupabaseClient().from('clients').select('*').order('name'); set({ clients: data || [] }); }
    finally { set({ loading: false }); }
  },
  createClient: async (clientData) => {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const user = session?.user; if (!user) throw new Error('Non authentifié');
    const { data, error } = await getSupabaseClient().from('clients').insert({ ...clientData, user_id: user.id }).select().single();
    if (error) throw error;
    set((s) => ({ clients: [...s.clients, data].sort((a, b) => a.name.localeCompare(b.name)) }));
    return data;
  },
  bulkCreateClients: async (items) => {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const user = session?.user; if (!user) throw new Error('Non authentifié');
    const { data, error } = await getSupabaseClient().from('clients').insert(items.map((c) => ({ ...c, user_id: user.id }))).select();
    if (error) throw error;
    set((s) => ({ clients: [...s.clients, ...(data || [])].sort((a, b) => a.name.localeCompare(b.name)) }));
    return data || [];
  },
  updateClient: async (id, updates) => {
    const { data, error } = await getSupabaseClient().from('clients').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    set((s) => ({ clients: s.clients.map((c) => (c.id === id ? data : c)) }));
  },
  deleteClient: async (id) => {
    const { error } = await getSupabaseClient().from('clients').delete().eq('id', id);
    if (error) throw error;
    set((s) => ({ clients: s.clients.filter((c) => c.id !== id) }));
  },

  fetchInvoices: async () => {
    set({ loading: true });
    try {
      const { data } = await getSupabaseClient().from('invoices').select('*, client:clients(*)').order('created_at', { ascending: false });
      set({ invoices: data || [] }); get().computeStats();
    } finally { set({ loading: false }); }
  },
  getNextInvoiceNumber: (prefix, n) => `${prefix}-${new Date().getFullYear()}-${String(n).padStart(3, '0')}`,
  createInvoice: async (formData, profile) => {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const user = session?.user; if (!user) throw new Error('Non authentifié');
    const items = formData.items.map((item) => ({ ...item, id: generateId(), total: item.quantity * item.unit_price }));
    const subtotal = items.reduce((s, i) => s + i.total, 0);
    const vatAmount = items.reduce((s, i) => s + i.total * (i.vat_rate / 100), 0);
    const docType = formData.document_type || 'invoice';
    const prefix = docType === 'quote' ? 'DEVIS' : docType === 'credit_note' ? 'AVOIR' : docType === 'purchase_order' ? 'BC' : docType === 'delivery_note' ? 'BL' : (profile.invoice_prefix || 'FACT');
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: counters, error: rpcError } = await getSupabaseClient().rpc('increment_invoice_count', { p_user_id: user.id, p_month: currentMonth });
    let number: string;
    if (rpcError || !counters?.invoice_count) {
      number = get().getNextInvoiceNumber(prefix, (profile.invoice_count || 0) + 1);
      await getSupabaseClient().from('profiles').update({ invoice_count: (profile.invoice_count || 0) + 1, monthly_invoice_count: (profile.monthly_invoice_count || 0) + 1, invoice_month: currentMonth }).eq('id', user.id);
    } else { number = get().getNextInvoiceNumber(prefix, counters.invoice_count); }
    const discountAmount = formData.discount_percent ? (subtotal + vatAmount) * (formData.discount_percent / 100) : 0;
    const { data, error } = await getSupabaseClient().from('invoices').insert({ user_id: user.id, client_id: formData.client_id || null, client_name_override: formData.client_name_override || null, number, document_type: docType, status: 'draft' as InvoiceStatus, issue_date: formData.issue_date, due_date: formData.due_date || null, items, subtotal, vat_amount: vatAmount, discount_percent: formData.discount_percent || null, discount_amount: discountAmount || null, total: subtotal + vatAmount - discountAmount, notes: formData.notes || null, linked_invoice_id: formData.linked_invoice_id || null, client_email: (formData as any).client_email || null, client_phone: (formData as any).client_phone || null, client_address: (formData as any).client_address || null, client_city: (formData as any).client_city || null, client_postal_code: (formData as any).client_postal_code || null }).select('*, client:clients(*)').single();
    if (error) throw error;
    set((s) => ({ invoices: [data, ...s.invoices] })); get().computeStats(); return data;
  },
  updateInvoice: async (id, updates) => {
    let u: any = { ...updates, updated_at: new Date().toISOString() };
    if (updates.items) {
      const items = updates.items.map((i) => ({ ...i, total: i.quantity * i.unit_price }));
      const subtotal = items.reduce((s, i) => s + i.total, 0);
      const vat = items.reduce((s, i) => s + i.total * (i.vat_rate / 100), 0);
      const existing = get().invoices.find((inv) => inv.id === id);
      const discPct = updates.discount_percent ?? existing?.discount_percent ?? 0;
      const discAmt = discPct > 0 ? (subtotal + vat) * (discPct / 100) : 0;
      u = { ...u, items, subtotal, vat_amount: vat, discount_percent: discPct || null, discount_amount: discAmt || null, total: subtotal + vat - discAmt };
    }
    const { data, error } = await getSupabaseClient().from('invoices').update(u).eq('id', id).select('*, client:clients(*)').single();
    if (error) throw error;
    set((s) => ({ invoices: s.invoices.map((inv) => (inv.id === id ? data : inv)) })); get().computeStats();
  },
  updateInvoiceStatus: async (id, status) => {
    const u: any = { status, updated_at: new Date().toISOString() };
    if (status === 'paid') u.paid_at = new Date().toISOString();
    if (status === 'sent') u.sent_at = new Date().toISOString();
    const { data, error } = await getSupabaseClient().from('invoices').update(u).eq('id', id).select('*, client:clients(*)').single();
    if (error) throw error;
    set((s) => ({ invoices: s.invoices.map((inv) => (inv.id === id ? data : inv)) })); get().computeStats();
  },
  deleteInvoice: async (id) => {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const user = session?.user;
    if (!user) throw new Error('Non authentifié');

    // Récupérer le profil pour vérifier le plan
    const { data: profile } = await getSupabaseClient().from('profiles').select('subscription_tier, monthly_invoice_count, invoice_month').eq('id', user.id).single();

    if (!profile) throw new Error('Profil introuvable');

    // Empêcher la suppression pour les utilisateurs gratuits
    if (profile.subscription_tier === 'free') {
      throw new Error('Les utilisateurs du plan gratuit ne peuvent pas supprimer de factures. Cette fonctionnalité est disponible avec les plans payants.');
    }

    const { error } = await getSupabaseClient().from('invoices').delete().eq('id', id);
    if (error) throw error;
    set((s) => ({ invoices: s.invoices.filter((inv) => inv.id !== id) })); get().computeStats();
  },
  duplicateInvoice: async (id, profile) => {
    const original = get().invoices.find((inv) => inv.id === id);
    if (!original) throw new Error('Facture introuvable');
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const user = session?.user; if (!user) throw new Error('Non authentifié');
    const today = new Date().toISOString().split('T')[0];
    const due = new Date(); due.setDate(due.getDate() + 30);
    const docType = original.document_type || 'invoice';
    const prefix = docType === 'quote' ? 'DEVIS' : docType === 'credit_note' ? 'AVOIR' : docType === 'purchase_order' ? 'BC' : docType === 'delivery_note' ? 'BL' : (profile.invoice_prefix || 'FACT');
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: counters } = await getSupabaseClient().rpc('increment_invoice_count', { p_user_id: user.id, p_month: currentMonth });
    const number = counters?.invoice_count ? get().getNextInvoiceNumber(prefix, counters.invoice_count) : get().getNextInvoiceNumber(prefix, (profile.invoice_count || 0) + 1);
    const { data, error } = await getSupabaseClient().from('invoices').insert({ user_id: user.id, client_id: original.client_id || null, client_name_override: original.client_name_override || null, number, document_type: docType, status: 'draft' as InvoiceStatus, issue_date: today, due_date: due.toISOString().split('T')[0], items: original.items, subtotal: original.subtotal, vat_amount: original.vat_amount, total: original.total, notes: original.notes || null }).select('*, client:clients(*)').single();
    if (error) throw error;
    set((s) => ({ invoices: [data, ...s.invoices] })); get().computeStats(); return data;
  },
  fetchRecurringInvoices: async () => {
    set({ loading: true });
    try { const { data } = await getSupabaseClient().from('recurring_invoices').select('*, client:clients(*)').order('next_run_date', { ascending: true }); set({ recurringInvoices: data || [] }); }
    finally { set({ loading: false }); }
  },
  createRecurringInvoice: async (recData) => {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const user = session?.user; if (!user) throw new Error('Non authentifié');
    const { data, error } = await getSupabaseClient().from('recurring_invoices').insert({ ...recData, user_id: user.id }).select('*, client:clients(*)').single();
    if (error) throw error;
    set((s) => ({ recurringInvoices: [...s.recurringInvoices, data] })); return data;
  },
  updateRecurringInvoice: async (id, updates) => {
    const { data, error } = await getSupabaseClient().from('recurring_invoices').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select('*, client:clients(*)').single();
    if (error) throw error;
    set((s) => ({ recurringInvoices: s.recurringInvoices.map((r) => (r.id === id ? data : r)) }));
  },
  deleteRecurringInvoice: async (id) => {
    const { error } = await getSupabaseClient().from('recurring_invoices').delete().eq('id', id);
    if (error) throw error;
    set((s) => ({ recurringInvoices: s.recurringInvoices.filter((r) => r.id !== id) }));
  },
  computeStats: () => {
    const { invoices } = get();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const paid = invoices.filter((i) => i.status === 'paid');
    const pending = invoices.filter((i) => i.status === 'sent');
    const overdue = invoices.filter((i) => i.status === 'sent' && i.due_date && new Date(i.due_date) < now);
    const mrr = invoices.filter((i) => i.status === 'paid' && new Date(i.created_at) >= startOfMonth).reduce((s, i) => s + i.total, 0);
    set({ stats: { mrr, pendingCount: pending.length, paidCount: paid.length, overdueCount: overdue.length, totalRevenue: paid.reduce((s, i) => s + i.total, 0), pendingRevenue: pending.reduce((s, i) => s + i.total, 0) } });
  },
}));
