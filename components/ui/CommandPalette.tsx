'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDataStore } from '@/stores/dataStore';
import { Search, FileText, Users, Receipt, Clipboard, RefreshCw, ShoppingCart, Truck, Banknote, X, ArrowRight, Clock } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

const DOC_ICON: Record<string, any> = {
  invoice: FileText,
  quote: Clipboard,
  credit_note: RefreshCw,
  purchase_order: ShoppingCart,
  delivery_note: Truck,
  deposit: Banknote,
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft:    { label: 'Brouillon',  color: 'text-gray-400' },
  sent:     { label: 'Envoyée',    color: 'text-blue-500' },
  paid:     { label: 'Payée',      color: 'text-green-500' },
  overdue:  { label: 'En retard',  color: 'text-red-500' },
  accepted: { label: 'Accepté',    color: 'text-purple-500' },
  refused:  { label: 'Refusé',     color: 'text-orange-500' },
};

interface Result {
  id: string;
  type: 'invoice' | 'client';
  title: string;
  subtitle: string;
  href: string;
  meta?: string;
  metaColor?: string;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { invoices, clients } = useDataStore();

  // Open on Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery('');
        setSelected(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const results: Result[] = (() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const invoiceResults: Result[] = invoices
      .filter((inv) =>
        inv.number.toLowerCase().includes(q) ||
        (inv.client?.name || inv.client_name_override || '').toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map((inv) => {
        const Icon = DOC_ICON[inv.document_type] || FileText;
        const st = STATUS_LABEL[inv.status] || STATUS_LABEL.draft;
        return {
          id: inv.id,
          type: 'invoice' as const,
          title: inv.number,
          subtitle: inv.client?.name || inv.client_name_override || '—',
          href: `/invoices/${inv.id}`,
          meta: `${formatCurrency(inv.total)} · ${st.label}`,
          metaColor: st.color,
        };
      });

    const clientResults: Result[] = clients
      .filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        type: 'client' as const,
        title: c.name,
        subtitle: c.email || c.city || '',
        href: `/clients/${c.id}`,
      }));

    return [...invoiceResults, ...clientResults].slice(0, 8);
  })();

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, results.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
      if (e.key === 'Enter' && results[selected]) {
        router.push(results[selected].href);
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, results, selected]);

  useEffect(() => { setSelected(0); }, [query]);

  const go = useCallback((href: string) => {
    router.push(href);
    setOpen(false);
  }, [router]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-start justify-center pt-[15vh] px-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
        {/* Search bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100">
          <Search size={18} className="text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une facture, un client..."
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 bg-transparent focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-300 hover:text-gray-500 transition-colors">
              <X size={16} />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-mono text-gray-400 bg-gray-100 border border-gray-200">
            ESC
          </kbd>
        </div>

        {/* Results */}
        {query.trim() === '' ? (
          <div className="px-4 py-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <Clock size={18} className="text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">Tapez pour rechercher dans vos factures et clients</p>
            <p className="text-xs text-gray-300 mt-1">↑ ↓ pour naviguer · Entrée pour ouvrir · Échap pour fermer</p>
          </div>
        ) : results.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-400">Aucun résultat pour <strong>"{query}"</strong></p>
          </div>
        ) : (
          <div className="py-1.5">
            {/* Group: Factures */}
            {results.filter((r) => r.type === 'invoice').length > 0 && (
              <>
                <div className="px-4 py-1.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Factures & Documents</p>
                </div>
                {results.filter((r) => r.type === 'invoice').map((result, i) => {
                  const globalIdx = results.indexOf(result);
                  const Icon = DOC_ICON[invoices.find(inv => inv.id === result.id)?.document_type || 'invoice'] || FileText;
                  return (
                    <button
                      key={result.id}
                      onClick={() => go(result.href)}
                      onMouseEnter={() => setSelected(globalIdx)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        selected === globalIdx ? 'bg-primary/6' : 'hover:bg-gray-50'
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        selected === globalIdx ? 'bg-primary/10' : 'bg-gray-100'
                      )}>
                        <Icon size={14} className={selected === globalIdx ? 'text-primary' : 'text-gray-400'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{result.title}</p>
                        <p className="text-xs text-gray-400 truncate">{result.subtitle}</p>
                      </div>
                      {result.meta && (
                        <p className={cn('text-xs font-semibold flex-shrink-0', result.metaColor || 'text-gray-400')}>
                          {result.meta}
                        </p>
                      )}
                      {selected === globalIdx && <ArrowRight size={14} className="text-primary flex-shrink-0" />}
                    </button>
                  );
                })}
              </>
            )}

            {/* Group: Clients */}
            {results.filter((r) => r.type === 'client').length > 0 && (
              <>
                <div className="px-4 py-1.5 mt-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Clients</p>
                </div>
                {results.filter((r) => r.type === 'client').map((result) => {
                  const globalIdx = results.indexOf(result);
                  return (
                    <button
                      key={result.id}
                      onClick={() => go(result.href)}
                      onMouseEnter={() => setSelected(globalIdx)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        selected === globalIdx ? 'bg-primary/6' : 'hover:bg-gray-50'
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black',
                        selected === globalIdx ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
                      )}>
                        {result.title[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{result.title}</p>
                        {result.subtitle && <p className="text-xs text-gray-400 truncate">{result.subtitle}</p>}
                      </div>
                      {selected === globalIdx && <ArrowRight size={14} className="text-primary flex-shrink-0" />}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-gray-50 flex items-center justify-between">
          <p className="text-[10px] text-gray-300 font-medium">{results.length} résultat{results.length !== 1 ? 's' : ''}</p>
          <div className="flex items-center gap-3 text-[10px] text-gray-300">
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-400 font-mono">↑↓</kbd> naviguer</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-400 font-mono">↵</kbd> ouvrir</span>
          </div>
        </div>
      </div>
    </div>
  );
}
