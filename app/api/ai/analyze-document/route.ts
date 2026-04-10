import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Accept either: FormData with `file`, or JSON with `url` + `mimeType`
export async function POST(req: NextRequest) {
  try {
    let base64: string;
    let mimeType: string;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });
      const arrayBuffer = await file.arrayBuffer();
      base64 = Buffer.from(arrayBuffer).toString('base64');
      mimeType = file.type || 'image/jpeg';
    } else {
      // URL-based: file already uploaded to Supabase storage
      const { url, mimeType: mt } = await req.json();
      if (!url) return NextResponse.json({ error: 'URL requise' }, { status: 400 });
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`Impossible de récupérer le fichier (${response.status})`);
      const arrayBuffer = await response.arrayBuffer();
      base64 = Buffer.from(arrayBuffer).toString('base64');
      mimeType = mt || 'image/jpeg';
    }

    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const completion = await openrouter.chat.completions.create({
      model: 'google/gemini-flash-1.5',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Tu es un expert en OCR et comptabilité. Lis attentivement cette image de facture ou justificatif et extrais TOUTES les informations visibles, même partiellement.

RÈGLES IMPORTANTES:
- Lis tout le texte visible dans l'image, y compris les petits caractères
- Pour "vendor": cherche le nom de l'entreprise émettrice (logo, en-tête, section ÉMETTEUR, nom en haut)
- Pour "amount": cherche TOTAL TTC, MONTANT TTC, TOTAL À PAYER — c'est le montant final avec taxes
- Pour "amount_ht": cherche TOTAL HT, SOUS-TOTAL, MONTANT HT
- Pour "vat_amount": cherche TVA, T.V.A., taxe — c'est amount - amount_ht
- Pour "invoice_number": cherche N° FACTURE, FACTURE N°, REF, NUMÉRO
- Pour "date": cherche DATE, DATE DE FACTURE — format YYYY-MM-DD
- Pour "due_date": cherche ÉCHÉANCE, DATE D'ÉCHÉANCE, À PAYER AVANT
- Si un nombre est écrit "1 040,00€" ou "1040,00€" ou "1.040,00€", c'est 1040.00
- Convertis toujours les virgules décimales en points (ex: 6240,00 → 6240.00)

Retourne UNIQUEMENT du JSON valide:
{
  "vendor": "nom de l'entreprise émettrice",
  "invoice_number": "numéro de facture ou null",
  "amount": montant TTC en nombre (ex: 6240.00),
  "amount_ht": montant HT en nombre ou null,
  "vat_amount": montant TVA en nombre ou null,
  "vat_rate": taux TVA en % (20, 10, 5.5, 2.1, ou 0) ou null,
  "date": "YYYY-MM-DD ou null",
  "due_date": "YYYY-MM-DD ou null",
  "description": "résumé en 1 ligne de ce qui est facturé",
  "category": "services" (par défaut si incertain, sinon: transport|meals|accommodation|equipment|office|shopping|other),
  "payment_method": "transfer|card|cash|check|prelevement ou null",
  "currency": "EUR",
  "supplier_siret": "SIRET 14 chiffres si visible sinon null",
  "supplier_vat_number": "numéro TVA si visible sinon null"
}`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    });

    let extracted: Record<string, any> = { amount: 0 };
    try {
      extracted = JSON.parse(completion.choices[0].message.content || '{}');
    } catch {
      return NextResponse.json({ error: 'Impossible d\'analyser le document' }, { status: 500 });
    }

    // Sanitize numbers
    const toNum = (v: any) => {
      if (v === null || v === undefined) return null;
      const n = typeof v === 'number' ? v : parseFloat(String(v));
      return isNaN(n) ? null : n;
    };
    extracted.amount     = toNum(extracted.amount)     ?? 0;
    extracted.amount_ht  = toNum(extracted.amount_ht);
    extracted.vat_amount = toNum(extracted.vat_amount);
    extracted.vat_rate   = toNum(extracted.vat_rate);

    // Validate category
    const VALID_CATS = ['transport', 'meals', 'accommodation', 'equipment', 'office', 'services', 'shopping', 'other'];
    if (!VALID_CATS.includes(extracted.category)) extracted.category = 'other';

    // Validate payment method
    const VALID_PM = ['card', 'cash', 'transfer', 'check', 'prelevement'];
    if (extracted.payment_method && !VALID_PM.includes(extracted.payment_method)) extracted.payment_method = null;

    return NextResponse.json({ extracted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
