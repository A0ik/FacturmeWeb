import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Lazy init — avoids module-level crash during build (env vars not available)
let _openrouter: OpenAI | null = null;
function getOpenRouter() {
  if (!_openrouter) {
    _openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY!,
    });
  }
  return _openrouter;
}

const EXTRACTION_PROMPT = `Tu es un expert en extraction de données d'entreprises françaises.
Analyse le contenu fourni et extrais TOUTES les entreprises/sociétés/clients/fournisseurs présents.

Pour chaque entité trouvée, extrais tous les champs disponibles :
- name (raison sociale / nom)
- siret (14 chiffres, sans espaces ni tirets)
- vat_number (format FR + 11 caractères)
- email
- phone
- address (rue, numéro)
- postal_code
- city
- country ("France" si non précisé)
- website

Règles STRICTES :
- Ne JAMAIS inventer de données — uniquement ce qui est dans le document
- Si un champ est absent → null
- Nettoie les SIRET : retire espaces/tirets → 14 chiffres continus
- Déduplique (même SIRET ou même nom = une seule entrée)

Retourne UNIQUEMENT du JSON valide (sans markdown, sans backticks) :
{
  "companies": [
    {
      "name": "string",
      "siret": "string ou null",
      "vat_number": "string ou null",
      "email": "string ou null",
      "phone": "string ou null",
      "address": "string ou null",
      "postal_code": "string ou null",
      "city": "string ou null",
      "country": "string",
      "website": "string ou null"
    }
  ],
  "summary": "description du document en 1 phrase"
}`;

// ── Vision model (images + PDF) ─────────────────────────────────────────────

async function analyzeWithVision(base64: string, mimeType: string): Promise<any> {
  // Use gemini-2.0-flash-exp — supports vision + json_object reliably via OpenRouter
  const effectiveMime = mimeType === 'application/pdf' ? 'image/jpeg' : mimeType;

  const completion = await getOpenRouter().chat.completions.create({
    model: 'google/gemini-2.0-flash-exp',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: EXTRACTION_PROMPT },
          {
            type: 'image_url',
            image_url: { url: `data:${effectiveMime};base64,${base64}` },
          },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 2000,
  });

  const raw = completion.choices[0].message.content || '{}';
  try { return JSON.parse(raw); } catch { return { companies: [] }; }
}

// ── Text model (CSV, TXT, JSON…) ─────────────────────────────────────────────

async function analyzeText(text: string): Promise<any> {
  const completion = await getOpenRouter().chat.completions.create({
    model: 'mistralai/mistral-small-24b-instruct-2501',
    messages: [
      { role: 'user', content: `${EXTRACTION_PROMPT}\n\n--- CONTENU À ANALYSER ---\n${text.slice(0, 40000)}` },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 2000,
  });

  const raw = completion.choices[0].message.content || '{}';
  try { return JSON.parse(raw); } catch { return { companies: [] }; }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function cleanCompanies(companies: any[]) {
  return companies
    .filter((c) => c?.name)
    .map((c) => ({
      name: String(c.name || '').trim(),
      siret: c.siret ? String(c.siret).replace(/[\s\-\.]/g, '').slice(0, 14) || null : null,
      vat_number: c.vat_number ? String(c.vat_number).replace(/[\s\-\.]/g, '').toUpperCase() || null : null,
      email: c.email || null,
      phone: c.phone || null,
      address: c.address || null,
      postal_code: c.postal_code || null,
      city: c.city || null,
      country: c.country || 'France',
      website: c.website || null,
    }));
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'Configuration IA manquante (OPENROUTER_API_KEY)' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 });
    }

    // Limit file size to 8MB
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 8 Mo)' }, { status: 413 });
    }

    const mimeType = file.type || '';
    const fileName = file.name.toLowerCase();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let result: any;

    // ── Images → vision model ──
    if (
      mimeType.startsWith('image/') ||
      /\.(png|jpg|jpeg|webp|gif|bmp|tiff)$/.test(fileName)
    ) {
      const base64 = buffer.toString('base64');
      result = await analyzeWithVision(base64, mimeType || 'image/jpeg');
    }

    // ── PDF → extract text first (fast+cheap), fallback to vision ──
    else if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      let usedVision = false;
      try {
        const pdfParse = require('pdf-parse');
        const pdfData = await pdfParse(buffer);
        const text = pdfData.text?.trim() || '';
        if (text.length > 50) {
          result = await analyzeText(text);
        } else {
          usedVision = true;
        }
      } catch {
        usedVision = true;
      }
      if (usedVision) {
        const base64 = buffer.toString('base64');
        result = await analyzeWithVision(base64, 'image/jpeg');
      }
    }

    // ── CSV / TXT / JSON / XML → plain text ──
    else if (
      mimeType.includes('text/') ||
      mimeType.includes('application/json') ||
      mimeType.includes('application/xml') ||
      /\.(csv|txt|json|xml|tsv|vcf)$/.test(fileName)
    ) {
      const text = buffer.toString('utf-8');
      result = await analyzeText(text);
    }

    // ── Word / Excel → try text extraction, fallback to vision ──
    else if (
      mimeType.includes('word') ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('excel') ||
      /\.(docx|doc|xlsx|xls|ods)$/.test(fileName)
    ) {
      const text = buffer.toString('utf-8').replace(/[^\x20-\x7E\u00C0-\u024F\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > 100) {
        result = await analyzeText(text);
      } else {
        const base64 = buffer.toString('base64');
        result = await analyzeWithVision(base64, mimeType || 'image/jpeg');
      }
    }

    // ── Unknown format → try as text, then vision ──
    else {
      const text = buffer.toString('utf-8');
      const isPrintable = text.replace(/[^\x20-\x7E\n\r\t]/g, '').length / text.length > 0.7;
      if (isPrintable && text.length > 50) {
        result = await analyzeText(text);
      } else {
        const base64 = buffer.toString('base64');
        result = await analyzeWithVision(base64, mimeType || 'image/jpeg');
      }
    }

    const companies = cleanCompanies(Array.isArray(result?.companies) ? result.companies : []);

    return NextResponse.json({
      companies,
      summary: result?.summary || `${companies.length} entreprise(s) détectée(s)`,
      total: companies.length,
    });
  } catch (error: any) {
    console.error('[import/clients]', error);

    if (error.status === 400) {
      return NextResponse.json({ error: 'Le fichier fourni ne peut pas être analysé par le modèle IA. Essayez un autre format (JPEG, PNG, PDF, CSV).' }, { status: 400 });
    }
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json({ error: 'Clé API invalide. Vérifiez OPENROUTER_API_KEY.' }, { status: 500 });
    }
    if (error.status === 429) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans quelques instants.' }, { status: 429 });
    }

    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}
