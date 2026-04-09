'use client';

import { use, useEffect, useRef, useState, useCallback } from 'react';
import { formatCurrency, formatDate, DOC_LABELS } from '@/lib/utils';
import {
  Download, PenTool, CheckCircle2, X, RotateCcw, Loader2,
} from 'lucide-react';

export default function SharePage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = use(params);
  const [invoice, setInvoice] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // E-signature state
  const [showSignPad, setShowSignPad] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    fetch(`/api/share/${invoiceId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setInvoice(d.invoice);
          setProfile(d.profile);
          if (d.invoice?.status === 'accepted' && d.invoice?.client_signature_url) {
            setSigned(true);
          }
        }
      })
      .catch(() => setError('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  // Canvas drawing helpers
  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    isDrawingRef.current = true;
    lastPosRef.current = getPos(e, canvas);
    setHasDrawn(true);
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPosRef.current = pos;
  }, []);

  const stopDraw = useCallback(() => {
    isDrawingRef.current = false;
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSign = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    setIsSigning(true);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const res = await fetch(`/api/invoices/${invoiceId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureDataUrl: dataUrl, signerName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSigned(true);
      setShowSignPad(false);
      setInvoice((inv: any) => ({
        ...inv,
        status: 'accepted',
        client_signature_url: data.signatureUrl,
        signed_at: new Date().toISOString(),
        signed_by: signerName || 'Client',
      }));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSigning(false);
    }
  };

  const handleDownload = async () => {
    const { downloadInvoicePdf } = await import('@/lib/pdf');
    downloadInvoicePdf(invoice, profile);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-10 h-10 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !invoice) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-2xl font-black text-gray-900 mb-2">Document introuvable</p>
        <p className="text-gray-500 text-sm">Ce lien est invalide ou a expiré.</p>
      </div>
    </div>
  );

  const accent = profile?.accent_color || '#1D9E75';
  const currency = profile?.currency || 'EUR';
  const locale = profile?.language === 'en' ? 'en-GB' : 'fr-FR';
  const fmt = (n: number) => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n);
  const clientName = invoice.client?.name || invoice.client_name_override || 'Client';
  const docLabel = DOC_LABELS[invoice.document_type as keyof typeof DOC_LABELS] || 'Facture';
  const isQuote = invoice.document_type === 'quote';

  return (
    <div className="min-h-screen bg-gray-50">
      <div style={{ background: accent }} className="h-1.5 w-full" />

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">

        {/* ── Signed banner ── */}
        {signed && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-4">
            <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-green-800">Devis accepté et signé</p>
              <p className="text-xs text-green-600 mt-0.5">
                Signé par {invoice.signed_by} le {invoice.signed_at ? new Date(invoice.signed_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'aujourd\'hui'}
              </p>
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              {profile?.logo_url && (
                <img src={profile.logo_url} alt="logo" className="h-12 max-w-[120px] object-contain mb-3" />
              )}
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{docLabel}</p>
              <p className="text-3xl font-black text-gray-900">{invoice.number}</p>
            </div>
            <button
              onClick={handleDownload}
              style={{ background: accent }}
              className="flex items-center gap-2 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
            >
              <Download size={15} />
              Télécharger
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-1">De</p>
              <p className="font-bold text-gray-900">{profile?.company_name || ''}</p>
              {profile?.siret && <p className="text-xs text-gray-500">SIRET {profile.siret}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Pour</p>
              <p className="font-bold text-gray-900">{clientName}</p>
              {invoice.client?.email && <p className="text-xs text-gray-500">{invoice.client.email}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Date d&apos;émission</p>
              <p className="font-semibold text-gray-900">{formatDate(invoice.issue_date, locale)}</p>
            </div>
            {invoice.due_date && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Échéance</p>
                <p className="font-semibold text-gray-900">{formatDate(invoice.due_date, locale)}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Items ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Prestations</h3>
          <div className="space-y-2">
            {(invoice.items || []).map((item: any, idx: number) => (
              <div key={item.id || idx} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{item.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.quantity} × {fmt(item.unit_price)} · TVA {item.vat_rate}%</p>
                </div>
                <p className="text-sm font-bold text-gray-900">{fmt(item.total)}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 mt-4 pt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Sous-total HT</span><span className="font-semibold">{fmt(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>TVA</span><span className="font-semibold">{fmt(invoice.vat_amount)}</span>
            </div>
            <div className="flex justify-between items-center rounded-xl px-4 py-3 text-white mt-2" style={{ background: '#1a1a2e' }}>
              <span className="text-xs font-bold uppercase tracking-wider opacity-70">Total TTC</span>
              <span className="text-2xl font-black" style={{ color: accent }}>{fmt(invoice.total)}</span>
            </div>
          </div>
        </div>

        {/* ── Notes ── */}
        {invoice.notes && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-bold text-gray-400 mb-1.5">Notes</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* ── Bank info ── */}
        {profile?.iban && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: accent }}>Coordonnées bancaires</p>
            <div className="text-sm text-gray-700 space-y-1">
              {profile.bank_name && <p><span className="text-gray-400">Banque :</span> {profile.bank_name}</p>}
              <p><span className="text-gray-400">IBAN :</span> {profile.iban}</p>
              {profile.bic && <p><span className="text-gray-400">BIC :</span> {profile.bic}</p>}
            </div>
          </div>
        )}

        {/* ── Pay online ── */}
        {invoice.stripe_payment_url && invoice.status !== 'paid' && (
          <a
            href={invoice.stripe_payment_url}
            style={{ background: accent }}
            className="flex items-center justify-center gap-2 text-white text-base font-bold py-4 rounded-2xl hover:opacity-90 transition-opacity"
          >
            Payer {fmt(invoice.total)} en ligne →
          </a>
        )}

        {/* ── E-Signature block (quotes only) ── */}
        {isQuote && !signed && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: accent + '20' }}>
                <PenTool size={16} style={{ color: accent }} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Signer ce devis</p>
                <p className="text-xs text-gray-500">Votre signature vaut acceptation du devis</p>
              </div>
            </div>

            {!showSignPad ? (
              <button
                onClick={() => setShowSignPad(true)}
                style={{ background: accent }}
                className="w-full flex items-center justify-center gap-2 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                <PenTool size={16} />
                Signer électroniquement
              </button>
            ) : (
              <div className="space-y-4">
                {/* Signer name */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                    Votre nom (optionnel)
                  </label>
                  <input
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="Prénom Nom"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-primary"
                    style={{ '--tw-ring-color': accent } as React.CSSProperties}
                  />
                </div>

                {/* Canvas pad */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                      Dessinez votre signature
                    </label>
                    <button
                      onClick={clearCanvas}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <RotateCcw size={11} /> Effacer
                    </button>
                  </div>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-gray-50 hover:border-gray-300 transition-colors">
                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={200}
                      className="w-full touch-none cursor-crosshair"
                      style={{ height: '160px' }}
                      onMouseDown={startDraw}
                      onMouseMove={draw}
                      onMouseUp={stopDraw}
                      onMouseLeave={stopDraw}
                      onTouchStart={startDraw}
                      onTouchMove={draw}
                      onTouchEnd={stopDraw}
                    />
                  </div>
                  {!hasDrawn && (
                    <p className="text-xs text-gray-400 text-center mt-2">
                      Signez dans le cadre ci-dessus avec votre souris ou votre doigt
                    </p>
                  )}
                </div>

                {/* Legal mention */}
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  En signant, vous acceptez les termes du devis {invoice.number} d&apos;un montant de <strong>{fmt(invoice.total)}</strong>.
                  La signature électronique est horodatée et juridiquement valable.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowSignPad(false); clearCanvas(); }}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSign}
                    disabled={!hasDrawn || isSigning}
                    style={{ background: accent }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
                  >
                    {isSigning
                      ? <><Loader2 size={14} className="animate-spin" /> Signature en cours...</>
                      : <><CheckCircle2 size={14} /> Valider la signature</>
                    }
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Signature display (already signed) ── */}
        {signed && invoice.client_signature_url && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={16} className="text-green-500" />
              <p className="text-sm font-bold text-gray-900">Signature électronique</p>
            </div>
            <img
              src={invoice.client_signature_url}
              alt="Signature"
              className="h-20 max-w-[280px] border border-gray-100 rounded-xl bg-gray-50 p-2 object-contain"
            />
            <p className="text-xs text-gray-400 mt-2">
              Signé par {invoice.signed_by} le {invoice.signed_at ? new Date(invoice.signed_at).toLocaleDateString('fr-FR') : '—'}
            </p>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pb-4">
          Document généré avec <strong>Factu.me</strong>
        </p>
      </div>
    </div>
  );
}
