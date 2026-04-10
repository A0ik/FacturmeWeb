import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// ─── Shared prompt ────────────────────────────────────────────────────────────

const PROMPT = `Tu es un expert en comptabilité et OCR. Analyse ce document et extrais les informations de facturation.

RÈGLES D'EXTRACTION:
- vendor: nom de l'entreprise émettrice (logo, en-tête, ÉMETTEUR, nom en haut à gauche)
- invoice_number: cherche N° FACTURE, FACTURE N°, NUMÉRO, REF — ex: "720000691318"
- amount: TOTAL TTC / MONTANT TTC / MONTANT À PAYER — valeur finale avec toutes taxes
- amount_ht: TOTAL HT / SOUS-TOTAL / MONTANT HT — valeur sans taxes
- vat_amount: TVA / T.V.A. — montant total de la taxe
- vat_rate: taux TVA principal en % (20, 10, 5.5, 2.1, ou 0)
- date: date d'émission de la facture → format YYYY-MM-DD
- due_date: ÉCHÉANCE / DATE LIMITE / À PAYER AVANT → format YYYY-MM-DD ou null
- description: résumé en 1 phrase de ce qui est facturé (service/produit)
- category: une seule valeur parmi transport|meals|accommodation|equipment|office|services|shopping|other
- expense_type: 'purchase' (si c'est une facture fournisseur classique) ou 'receipt' (si c'est un ticket de caisse, reçu, note de frais de déplacement/restaurant)
- payment_method: transfer|card|cash|check|prelevement ou null
- IMPORTANT: convertis les montants FR (ex: "52,74 €" → 52.74 / "1 040,00€" → 1040.00)

Retourne UNIQUEMENT du JSON valide (pas de markdown, pas de commentaires):
{"vendor":null,"invoice_number":null,"amount":0,"amount_ht":null,"vat_amount":null,"vat_rate":null,"date":null,"due_date":null,"description":null,"category":"other","expense_type":"purchase","payment_method":null,"currency":"EUR","supplier_siret":null,"supplier_vat_number":null}`;

// ─── Sanitize numbers ─────────────────────────────────────────────────────────

function sanitize(raw: Record<string, any>) {
  const toNum = (v: any): number | null => {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number' && !isNaN(v)) return v;
    // Handle French number format: "1 040,74" or "1.040,74"
    const s = String(v).replace(/\s/g, '').replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  };

  const VALID_CATS = ['transport', 'meals', 'accommodation', 'equipment', 'office', 'services', 'shopping', 'other'];
  const VALID_PM   = ['card', 'cash', 'transfer', 'check', 'prelevement'];
  const VALID_TYPE = ['purchase', 'receipt'];

  return {
    ...raw,
    amount:     toNum(raw.amount) ?? 0,
    amount_ht:  toNum(raw.amount_ht),
    vat_amount: toNum(raw.vat_amount),
    vat_rate:   toNum(raw.vat_rate),
    category:   VALID_CATS.includes(raw.category) ? raw.category : 'other',
    expense_type: VALID_TYPE.includes(raw.expense_type) ? raw.expense_type : 'purchase',
    payment_method: VALID_PM.includes(raw.payment_method) ? raw.payment_method : null,
  };
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const mimeType    = file.type || 'image/jpeg';
    const isPDF       = mimeType === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');

    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    let responseText: string | null = null;

    // ── PDF: extract text first, then analyze as plain text ──────────────────
    if (isPDF) {
      try {
        // Dynamic import avoids webpack bundling issues with pdf-parse
        const pdfParse = require('pdf-parse');
        const buffer   = Buffer.from(arrayBuffer);
        const pdfData  = await pdfParse(buffer);
        const text     = pdfData.text?.trim() || '';

        if (text.length > 20) {
          // We have usable text — analyze with a text model (fast + cheap)
          const completion = await openrouter.chat.completions.create({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'user',
                content: `${PROMPT}\n\n--- TEXTE EXTRAIT DU PDF ---\n${text.slice(0, 12000)}`,
              },
            ],
            response_format: { type: 'json_object' },
          });
          responseText = completion.choices[0].message.content;
        }
        // else: fall through to vision below
      } catch {
        // pdf-parse failed — fall through to vision
      }
    }

    // ── Image (or PDF fallback): vision model ─────────────────────────────────
    if (!responseText) {
      const base64     = Buffer.from(arrayBuffer).toString('base64');
      const completion = await openrouter.chat.completions.create({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROMPT },
              { type: 'image_url', image_url: { url: `data:${isPDF ? 'image/jpeg' : mimeType};base64,${base64}` } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
      });
      responseText = completion.choices[0].message.content;
    }

    // ── Parse + sanitize result ───────────────────────────────────────────────
    let extracted: Record<string, any> = { amount: 0 };
    try {
      extracted = JSON.parse(responseText || '{}');
    } catch {
      return NextResponse.json({ error: 'Réponse IA invalide' }, { status: 500 });
    }

    return NextResponse.json({ extracted: sanitize(extracted) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
