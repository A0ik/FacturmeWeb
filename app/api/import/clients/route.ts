import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

const SYSTEM_PROMPT = `Tu es un expert en extraction de données d'entreprises françaises.
Analyse le contenu fourni (document, tableau, liste, contrat, facture, devis, fichier comptable...) et extrais TOUTES les entreprises/sociétés/clients/fournisseurs présents.

Pour chaque entité trouvée, extrais TOUS les champs disponibles :
- name (raison sociale / nom)
- siret (14 chiffres, nettoyé de tout espace ou tiret)
- vat_number (numéro TVA intracommunautaire, format FR + 11 chiffres)
- email
- phone (format international si possible)
- address (rue, numéro)
- postal_code (code postal)
- city (ville)
- country (pays, "France" si non précisé)
- website (URL si présente)

Règles STRICTES :
- Ne JAMAIS inventer de données — n'inclus que ce qui est explicitement dans le document
- Si un champ est absent, mets null
- Nettoie les SIRET : retire espaces, tirets, points → 14 chiffres continus
- Nettoie les numéros TVA : format FR + 11 caractères alphanumériques
- Déduplique (même SIRET ou même nom = une seule entrée)
- Inclus les entreprises même si tu n'as que le nom

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
  "summary": "brève description du document analysé en 1 phrase"
}`;

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // Dynamic import to avoid Next.js build issues with CommonJS
  const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
  const data = await pdfParse(buffer);
  return data.text;
}

async function extractWithVision(base64: string, mimeType: string): Promise<string> {
  const completion = await openrouter.chat.completions.create({
    model: 'openai/gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64}` },
          },
          {
            type: 'text',
            text: 'Extrais TOUT le texte présent dans cette image, en préservant la structure (tableaux, colonnes, etc.). Retourne uniquement le texte brut.',
          },
        ],
      },
    ],
    max_tokens: 4000,
  });
  return completion.choices[0].message.content || '';
}

async function callLLM(content: string): Promise<any> {
  const completion = await openrouter.chat.completions.create({
    model: 'openai/gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Voici le contenu à analyser :\n\n${content.slice(0, 40000)}` },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 4000,
  });

  const raw = completion.choices[0].message.content || '{}';
  try {
    return JSON.parse(raw);
  } catch {
    // Try to extract JSON from the response
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return { companies: [] };
  }
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

    let textContent = '';

    // ── PDF ──
    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      try {
        textContent = await extractTextFromPDF(buffer);
      } catch (e) {
        // Fallback: send as image via vision model if PDF parse fails
        const base64 = buffer.toString('base64');
        textContent = await extractWithVision(base64, 'application/pdf');
      }
    }

    // ── Images ──
    else if (mimeType.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif|bmp|tiff)$/.test(fileName)) {
      const base64 = buffer.toString('base64');
      textContent = await extractWithVision(base64, mimeType || 'image/jpeg');
    }

    // ── CSV / TXT / JSON / XML ──
    else if (
      mimeType.includes('text/') ||
      mimeType.includes('application/json') ||
      mimeType.includes('application/xml') ||
      /\.(csv|txt|json|xml|tsv)$/.test(fileName)
    ) {
      textContent = buffer.toString('utf-8');
    }

    // ── Excel XLSX/XLS ──
    else if (
      mimeType.includes('spreadsheet') ||
      mimeType.includes('excel') ||
      /\.(xlsx|xls|ods)$/.test(fileName)
    ) {
      // Convert to readable format: extract as base64 and describe
      // We send the file to GPT-4o vision which can handle Excel content
      const base64 = buffer.toString('base64');
      textContent = await extractWithVision(base64, mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }

    // ── Word DOCX ──
    else if (
      mimeType.includes('word') ||
      mimeType.includes('officedocument.wordprocessingml') ||
      /\.(docx|doc)$/.test(fileName)
    ) {
      // Try to extract text as UTF-8, fallback to vision
      try {
        textContent = buffer.toString('utf-8').replace(/[^\x20-\x7E\u00C0-\u024F\n\r\t]/g, ' ').replace(/\s+/g, ' ');
        if (textContent.length < 50) throw new Error('insufficient text');
      } catch {
        const base64 = buffer.toString('base64');
        textContent = await extractWithVision(base64, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      }
    }

    // ── Fallback: try UTF-8 text ──
    else {
      try {
        textContent = buffer.toString('utf-8');
      } catch {
        return NextResponse.json({ error: 'Format de fichier non supporté' }, { status: 400 });
      }
    }

    if (!textContent || textContent.trim().length < 3) {
      return NextResponse.json({
        companies: [],
        summary: 'Aucun contenu textuel exploitable trouvé dans le fichier.',
      });
    }

    // ── Call LLM for extraction ──
    const result = await callLLM(textContent);
    const companies: any[] = Array.isArray(result?.companies) ? result.companies : [];

    // Clean up SIRETs and VAT numbers
    const cleaned = companies
      .filter((c) => c?.name)
      .map((c) => ({
        name: (c.name || '').trim(),
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

    return NextResponse.json({
      companies: cleaned,
      summary: result?.summary || `${cleaned.length} entreprise(s) détectée(s)`,
      total: cleaned.length,
    });
  } catch (error: any) {
    console.error('[import/clients]', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}

export const config = {
  api: { bodyParser: false },
};
