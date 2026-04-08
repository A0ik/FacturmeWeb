import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

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

Retourne UNIQUEMENT du JSON valide :
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

async function analyzeWithVision(base64: string, mimeType: string): Promise<any> {
  const completion = await openrouter.chat.completions.create({
    model: 'openai/gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: EXTRACTION_PROMPT,
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
          {
            type: 'text',
            text: 'Extrais toutes les entreprises présentes dans ce document.',
          },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 4000,
  });

  const raw = completion.choices[0].message.content || '{}';
  try { return JSON.parse(raw); } catch { return { companies: [] }; }
}

async function analyzeText(text: string): Promise<any> {
  const completion = await openrouter.chat.completions.create({
    model: 'openai/gpt-4o-mini',
    messages: [
      { role: 'system', content: EXTRACTION_PROMPT },
      { role: 'user', content: `Voici le contenu à analyser :\n\n${text.slice(0, 40000)}` },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 4000,
  });

  const raw = completion.choices[0].message.content || '{}';
  try { return JSON.parse(raw); } catch { return { companies: [] }; }
}

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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 });
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

    // ── PDF → vision model (GPT-4o handles PDFs natively via base64) ──
    else if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      const base64 = buffer.toString('base64');
      result = await analyzeWithVision(base64, 'application/pdf');
    }

    // ── Excel / Spreadsheets → vision ──
    else if (
      mimeType.includes('spreadsheet') ||
      mimeType.includes('excel') ||
      /\.(xlsx|xls|ods)$/.test(fileName)
    ) {
      const base64 = buffer.toString('base64');
      result = await analyzeWithVision(
        base64,
        mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    }

    // ── Word documents → try text extraction, fallback to vision ──
    else if (
      mimeType.includes('word') ||
      mimeType.includes('officedocument.wordprocessingml') ||
      /\.(docx|doc)$/.test(fileName)
    ) {
      // Try basic text extraction for docx (XML-based format)
      const text = buffer.toString('utf-8').replace(/[^\x20-\x7E\u00C0-\u024F\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > 100) {
        result = await analyzeText(text);
      } else {
        const base64 = buffer.toString('base64');
        result = await analyzeWithVision(base64, mimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
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

    // ── Unknown format → try as text, then vision ──
    else {
      const text = buffer.toString('utf-8');
      const isPrintable = text.replace(/[^\x20-\x7E\n\r\t]/g, '').length / text.length > 0.7;
      if (isPrintable && text.length > 50) {
        result = await analyzeText(text);
      } else {
        const base64 = buffer.toString('base64');
        result = await analyzeWithVision(base64, mimeType || 'application/octet-stream');
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
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}
