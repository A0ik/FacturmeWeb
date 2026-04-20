import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'Configuration IA manquante (GROQ_API_KEY)' }, { status: 500 });
    }
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'Configuration IA manquante (OPENROUTER_API_KEY)' }, { status: 500 });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const openrouter = new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: process.env.OPENROUTER_API_KEY });
    const formData = await req.formData();
    const audio = formData.get('audio') as File;
    const sector = formData.get('sector') as string || '';
    const isEdit = formData.get('isEdit') === 'true';
    const existingItemsRaw = formData.get('existingItems') as string | null;

    let existingItems: any[] = [];
    if (isEdit && existingItemsRaw) {
      try { existingItems = JSON.parse(existingItemsRaw); } catch { existingItems = []; }
    }

    if (!audio) return NextResponse.json({ error: 'No audio file' }, { status: 400 });

    // Transcription with Groq Whisper
    const transcription = await groq.audio.transcriptions.create({
      file: audio,
      model: 'whisper-large-v3-turbo',
      language: 'fr',
    });
    const transcript = transcription.text;

    const sectorHint = sector ? `L'utilisateur travaille dans le secteur : ${sector}.` : '';

    let systemPrompt: string;

    if (isEdit && existingItems.length) {
      const existingList = existingItems
        .map((item, i) =>
          `  ${i + 1}. "${item.description || '(sans description)'}" — qté: ${item.quantity}, prix HT: ${item.unit_price}€, TVA: ${item.vat_rate}%`
        )
        .join('\n');

      systemPrompt = `Tu es un assistant expert en facturation française. ${sectorHint}
L'utilisateur a déjà une facture en cours avec les lignes suivantes :

LIGNES EXISTANTES :
${existingList}

L'utilisateur vient de dicter une modification. Analyse son intention précisément :

- "ajoute / rajoute / nouvelle ligne / et aussi" → AJOUTER le(s) nouvel(s) item(s) à la liste existante
- "modifie / change / mets à X€ / X jours / la ligne N" → MODIFIER uniquement l'item concerné
- "supprime / enlève la ligne N / retire" → SUPPRIMER l'item concerné
- "remplace tout / nouvelle facture / efface tout" → REMPLACER toute la liste

Retourne UNIQUEMENT du JSON valide :
{
  "action": "added" | "modified" | "removed" | "replaced",
  "summary": "Phrase courte décrivant la modification, ex: 'Ligne Design web ajoutée à 800€/j'",
  "client_name": null,
  "items": [
    { "description": "string", "quantity": number, "unit_price": number, "vat_rate": number }
  ],
  "due_days": null,
  "notes": null
}

RÈGLES ABSOLUES :
- "items" doit contenir la liste COMPLÈTE après application de la modification
- unit_price est TOUJOURS HT (hors taxes)
- vat_rate par défaut = 20
- Ne modifie que ce que l'utilisateur demande explicitement, conserve le reste à l'identique
- summary doit être en français, court et précis`;
    } else {
      systemPrompt = `Tu es un assistant expert en facturation française. ${sectorHint}
L'utilisateur vient de dicter une facture à voix haute. Extrais les informations et retourne UNIQUEMENT du JSON valide.

Format attendu:
{
  "action": "replaced",
  "summary": null,
  "client_name": "string ou null",
  "client_email": "string ou null — email du client",
  "client_phone": "string ou null — téléphone du client",
  "client_address": "string ou null — adresse rue du client",
  "client_city": "string ou null — ville du client",
  "client_postal_code": "string ou null — code postal du client",
  "client_siret": "string ou null — numéro SIRET du client (14 chiffres)",
  "client_vat_number": "string ou null — numéro de TVA intracommunautaire du client (format FRXX123456789)",
  "items": [{"description": "string", "quantity": number, "unit_price": number, "vat_rate": number}],
  "due_days": number,
  "notes": "string ou null",
  "discount_percent": number
}

Règles ABSOLUES pour les descriptions :
- NE JAMAIS recopier mot pour mot ce que l'utilisateur a dit
- Rédige une description PROFESSIONNELLE et COMMERCIALE, comme on le ferait sur une vraie facture
- Ex: l'utilisateur dit "site internet pour mon client" → description: "Conception et développement de site web"
- Ex: l'utilisateur dit "logo" → description: "Création d'identité visuelle et logotype"
- Ex: l'utilisateur dit "3 jours de conseil" → description: "Prestation de conseil et accompagnement stratégique"
- La description doit être claire, professionnelle, entre 3 et 10 mots
- unit_price est TOUJOURS HT (hors taxes)
- Extrais LES INFORMATIONS CLIENT si mentionnées : email, téléphone, adresse, code postal, ville, SIRET, numéro de TVA
- SIRET : 14 chiffres sans espaces ni points
- TVA : format français FRXX123456789 (où XX = numéro de clé, 9 chiffres = SIREN)
- vat_rate par défaut = 20
- due_days = délai de paiement en jours (30 par défaut)
- IMPORTANT: discount_percent (remise globale) ne doit être ajouté QUE si l'utilisateur le demande explicitement (ex: "remise 10%", "10% de remise", "faire une remise"). Si l'utilisateur ne mentionne aucune remise, mets discount_percent à 0.
- Si le montant est TTC, calcule le HT en divisant par (1 + vat_rate/100)`;
    }

    const completion = await openrouter.chat.completions.create({
      model: 'mistralai/mistral-small-24b-instruct-2501',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    let parsed: any = {};
    try {
      parsed = JSON.parse(completion.choices[0].message.content || '{}');
    } catch (err) {
      console.error('[process-voice] Failed to parse AI response:', err);
      parsed = {};
    }

    return NextResponse.json({ transcript, parsed, action: parsed.action, summary: parsed.summary });
  } catch (error: any) {
    console.error('[Process Voice] Error:', error);
    const message = error.message || 'Erreur lors du traitement vocal';
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json({ error: 'Clé API invalide. Vérifiez GROQ_API_KEY et OPENROUTER_API_KEY.' }, { status: 500 });
    }
    if (error.status === 429) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans quelques instants.' }, { status: 429 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
