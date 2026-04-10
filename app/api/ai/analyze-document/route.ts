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
              text: `Tu es un assistant comptable expert. Analyse cette facture ou ce justificatif et extrait TOUTES les informations visibles.
Retourne UNIQUEMENT du JSON valide sans aucun commentaire ni markdown:
{
  "vendor": "nom exact du fournisseur / émetteur de la facture",
  "invoice_number": "numéro de facture ou bon de commande (ex: FAC-2024-001) ou null",
  "amount": montant TTC total en nombre décimal (ex: 119.99) — obligatoire, 0 si illisible,
  "amount_ht": montant hors taxes en nombre décimal ou null,
  "vat_amount": montant TVA en nombre décimal ou null,
  "vat_rate": taux TVA principal parmi 20, 10, 5.5, 2.1, 0 (nombre entier ou décimal) ou null,
  "date": "date de la facture au format YYYY-MM-DD ou null",
  "due_date": "date d'échéance au format YYYY-MM-DD ou null",
  "description": "description courte en français de l'achat ou service (1 ligne max)",
  "category": une seule valeur exacte parmi: transport, meals, accommodation, equipment, office, services, shopping, other,
  "payment_method": une seule valeur exacte parmi: card, cash, transfer, check, prelevement — ou null si non mentionné,
  "currency": "EUR" par défaut sauf si autre devise clairement visible (USD, GBP, etc.),
  "supplier_siret": "numéro SIRET à 14 chiffres du fournisseur si visible sinon null",
  "supplier_vat_number": "numéro TVA intracommunautaire fournisseur (ex: FR12345678901) si visible sinon null"
}
Si une information est absente ou illisible, mets null (pas de chaîne vide). Ne devine pas.`,
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
