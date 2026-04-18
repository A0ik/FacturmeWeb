import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Lazy init — avoids module-level crash during build
let _openrouter: OpenAI | null = null;
function getOpenRouter() {
  if (!_openrouter) {
    _openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY!,
      timeout: 60_000, // 60s max — évite les hangs infinis
    });
  }
  return _openrouter;
}

const EXTRACTION_PROMPT = `Tu es un expert en extraction de données d'entreprises françaises.
Analyse le contenu fourni et extrais TOUTES les entreprises, sociétés, clients, fournisseurs, partenaires présents.
Sois EXHAUSTIF — il vaut mieux extraire trop que pas assez.

Pour chaque entité trouvée, extrais tous les champs disponibles :
- name (raison sociale obligatoire)
- siret (14 chiffres continus, sans espaces)
- vat_number (format FR suivi de 11 caractères)
- email
- phone
- address (rue et numéro)
- postal_code (code postal)
- city (ville)
- country ("France" par défaut si non précisé)
- website

Règles :
- Extrais TOUT nom d'entreprise/organisation visible, même partiel
- Si un champ est absent → null
- Nettoie les SIRET : retire espaces, tirets, points → 14 chiffres
- Déduplique si même nom ou même SIRET

Réponds UNIQUEMENT avec du JSON valide, sans markdown, sans backticks, sans commentaires :
{"companies":[{"name":"...","siret":null,"vat_number":null,"email":null,"phone":null,"address":null,"postal_code":null,"city":null,"country":"France","website":null}],"summary":"..."}`;

// ── Robust JSON extractor — handles markdown-wrapped responses ────────────────

function extractJSON(raw: string): any {
  if (!raw) return { companies: [] };

  // Strip markdown code blocks ```json ... ``` or ``` ... ```
  let cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch { }

  // Find the first { ... } block
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch { }
  }

  // Last resort: try to find a "companies" array
  const arrMatch = cleaned.match(/"companies"\s*:\s*(\[[\s\S]*?\])/);
  if (arrMatch) {
    try {
      return { companies: JSON.parse(arrMatch[1]) };
    } catch { }
  }

  return { companies: [] };
}

// ── Single model for everything: gpt-4o-mini ─────────────────────────────────
// Reliable on OpenRouter, supports vision + text + response_format json_object

const MODEL = 'openai/gpt-4o-mini';

async function analyzeWithVision(base64: string, mimeType: string): Promise<any> {
  const completion = await getOpenRouter().chat.completions.create({
    model: MODEL,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: EXTRACTION_PROMPT },
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
        ],
      },
    ],
    max_tokens: 4000,
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  return extractJSON(raw);
}

async function analyzeText(text: string): Promise<any> {
  const completion = await getOpenRouter().chat.completions.create({
    model: MODEL,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: `${EXTRACTION_PROMPT}\n\n--- CONTENU À ANALYSER ---\n${text.slice(0, 60000)}`,
      },
    ],
    max_tokens: 4000,
  });

  const raw = completion.choices[0]?.message?.content || '{}';
  return extractJSON(raw);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function cleanCompanies(companies: any[]) {
  return companies
    .filter((c) => c?.name && String(c.name).trim().length > 0)
    .map((c) => ({
      name: String(c.name || '').trim(),
      siret: c.siret ? String(c.siret).replace(/[\s\-\.]/g, '').slice(0, 14) || null : null,
      vat_number: c.vat_number ? String(c.vat_number).replace(/[\s\-\.]/g, '').toUpperCase() || null : null,
      email: c.email ? String(c.email).trim() : null,
      phone: c.phone ? String(c.phone).trim() : null,
      address: c.address ? String(c.address).trim() : null,
      postal_code: c.postal_code ? String(c.postal_code).trim() : null,
      city: c.city ? String(c.city).trim() : null,
      country: c.country ? String(c.country).trim() : 'France',
      website: c.website ? String(c.website).trim() : null,
    }))
    // Deduplicate by name (case-insensitive)
    .filter((c, idx, arr) =>
      arr.findIndex((x) => x.name.toLowerCase() === c.name.toLowerCase()) === idx
    );
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

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo)' }, { status: 413 });
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
      const effectiveMime = mimeType || 'image/jpeg';
      result = await analyzeWithVision(base64, effectiveMime);
    }

    // ── PDF → extract text, multiple strategies ──
    else if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      let textForAnalysis = '';

      // Strategy 1: pdf-parse (best for text-based PDFs)
      try {
        const pdfParse = require('pdf-parse');
        const pdfData = await pdfParse(buffer);
        const extracted = pdfData.text?.trim() || '';
        if (extracted.length > 10) {
          textForAnalysis = extracted;
        }
      } catch {
        // pdf-parse failed (scanned PDF or corrupted)
      }

      // Strategy 2: raw binary text extraction (works even on scanned PDFs —
      // PDFs embed metadata, creator info, font names, sometimes OCR text)
      if (!textForAnalysis) {
        const rawLatin = buffer.toString('latin1');
        // Extract readable ASCII strings of 4+ chars
        const strings = rawLatin.match(/[\x20-\x7E]{4,}/g) || [];
        const raw = strings.join(' ').replace(/\s+/g, ' ').trim();
        if (raw.length > 50) {
          textForAnalysis = raw.slice(0, 60000);
        }
      }

      if (textForAnalysis) {
        result = await analyzeText(textForAnalysis);
      } else {
        // Last resort: try vision with JPEG mime (some OpenRouter models tolerate it)
        try {
          const base64 = buffer.toString('base64');
          result = await analyzeWithVision(base64, 'image/jpeg');
        } catch {
          result = { companies: [], summary: 'PDF non lisible — essayez une capture d\'écran PNG ou JPEG' };
        }
      }
    }

    // ── CSV / TXT / JSON / XML / VCF → plain text ──
    else if (
      mimeType.includes('text/') ||
      mimeType.includes('application/json') ||
      mimeType.includes('application/xml') ||
      /\.(csv|txt|json|xml|tsv|vcf)$/.test(fileName)
    ) {
      const text = buffer.toString('utf-8');
      result = await analyzeText(text);
    }

    // ── Word / Excel → best-effort text extraction ──
    else if (
      mimeType.includes('word') ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('excel') ||
      /\.(docx|doc|xlsx|xls|ods)$/.test(fileName)
    ) {
      // Binary files — strip non-printable chars, keep readable text
      const text = buffer
        .toString('utf-8')
        .replace(/[^\x20-\x7E\u00C0-\u024F\n\r\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text.length > 80) {
        result = await analyzeText(text);
      } else {
        const base64 = buffer.toString('base64');
        result = await analyzeWithVision(base64, mimeType || 'image/jpeg');
      }
    }

    // ── Unknown → try as text, then vision ──
    else {
      const text = buffer.toString('utf-8');
      const printableRatio = text.replace(/[^\x20-\x7E\n\r\t]/g, '').length / Math.max(text.length, 1);
      if (printableRatio > 0.6 && text.length > 30) {
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
    console.error('[import/clients] error:', error?.message, error?.status);

    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: 'Clé API OpenRouter invalide. Vérifiez OPENROUTER_API_KEY dans vos variables d\'environnement.' }, { status: 500 });
    }
    if (error?.status === 429) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans quelques instants.' }, { status: 429 });
    }

    return NextResponse.json({ error: error?.message || 'Erreur serveur inattendue' }, { status: 500 });
  }
}
