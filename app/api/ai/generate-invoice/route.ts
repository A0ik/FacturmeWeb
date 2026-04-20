import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const { prompt, sector, isEdit, existingItems } = await req.json();
    if (!prompt?.trim()) return NextResponse.json({ error: 'Prompt requis' }, { status: 400 });

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'Configuration IA manquante (OPENROUTER_API_KEY)' }, { status: 500 });
    }

    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const sectorHint = sector ? `L'utilisateur travaille dans le secteur : ${sector}.` : '';

    let systemPrompt: string;

    if (isEdit && existingItems?.length) {
      const existingList = (existingItems as any[])
        .map((item, i) =>
          `  ${i + 1}. "${item.description || '(sans description)'}" — qté: ${item.quantity}, prix HT: ${item.unit_price}€, TVA: ${item.vat_rate}%`
        )
        .join('\n');

      systemPrompt = `Tu es un assistant expert en facturation française. ${sectorHint}
L'utilisateur a déjà une facture en cours avec les lignes suivantes :

LIGNES EXISTANTES :
${existingList}

L'utilisateur veut faire une modification. Analyse son intention précisément :

- "ajoute / rajoute / nouvelle ligne / et aussi" → AJOUTER le(s) nouvel(s) item(s) à la liste existante
- "modifie / change / mets à X€ / X jours / la ligne N" → MODIFIER uniquement l'item concerné
- "supprime / enlève la ligne N / retire" → SUPPRIMER l'item concerné
- "remplace tout / nouvelle facture / efface tout" → REMPLACER toute la liste

Retourne UNIQUEMENT du JSON valide avec ce format :
{
  "action": "added" | "modified" | "removed" | "replaced",
  "summary": "Phrase courte décrivant la modification faite, ex: 'Ligne Design web ajoutée à 800€/j'",
  "client_name": null,
  "items": [
    { "description": "string", "quantity": number, "unit_price": number, "vat_rate": number }
  ],
  "due_days": null,
  "notes": null,
  "discount_percent": null
}

RÈGLES ABSOLUES :
- "items" doit contenir la liste COMPLÈTE après application de la modification
- unit_price est TOUJOURS HT (hors taxes)
- vat_rate par défaut = 20
- Ne modifie que ce que l'utilisateur demande explicitement, conserve le reste à l'identique
- summary doit être en français, court et précis`;
    } else {
      systemPrompt = `Tu es un assistant expert en facturation française. ${sectorHint}
L'utilisateur décrit en langage naturel ce qu'il veut facturer.
Extrais les informations et retourne UNIQUEMENT du JSON valide.

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
  "items": [
    {
      "description": "string — description détaillée et professionnelle",
      "quantity": number,
      "unit_price": number,
      "vat_rate": number
    }
  ],
  "due_days": number,
  "notes": "string ou null",
  "discount_percent": number
}

Règles strictes:
- unit_price est TOUJOURS HT (hors taxes)
- vat_rate par défaut = 20 (taux normal français)
- due_days = délai paiement en jours (30 par défaut)
- IMPORTANT: discount_percent (remise globale) ne doit être ajouté QUE si l'utilisateur le demande explicitement (ex: "remise 10%", "10% de remise", "faire une remise", "avec une remise de 5%"). Si l'utilisateur ne mentionne aucune remise, mets discount_percent à 0.
- Si un montant TTC est mentionné, convertis en HT : HT = TTC / (1 + vat_rate/100)
- Extrais LES INFORMATIONS CLIENT si mentionnées : email, téléphone, adresse, code postal, ville, SIRET, numéro de TVA
- SIRET : 14 chiffres sans espaces ni points
- TVA : format français FRXX123456789 (où XX = numéro de clé, 9 chiffres = SIREN)
- Génère des descriptions PROFESSIONNELLES et COMMERCIALES (jamais de copier-coller du prompt)
  Ex: "site web" → "Conception et développement de site web"
  Ex: "logo" → "Création d'identité visuelle et logotype"
  Ex: "conseil 3 jours" → "Prestation de conseil et accompagnement stratégique"
- La description doit être claire, professionnelle, entre 3 et 10 mots
- Si l'utilisateur ne mentionne pas de quantité, utilise 1`;
    }

    const completion = await openrouter.chat.completions.create({
      model: 'mistralai/mistral-small-24b-instruct-2501',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    let parsed: any = {};
    try {
      parsed = JSON.parse(completion.choices[0].message.content || '{}');
    } catch {
      return NextResponse.json({ error: 'Erreur parsing IA' }, { status: 500 });
    }

    return NextResponse.json({ parsed, action: parsed.action, summary: parsed.summary });
  } catch (error: any) {
    console.error('[AI Generate Invoice] Error:', error);
    const message = error.message || 'Erreur lors de la génération IA';
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json({ error: 'Clé API invalide ou expirée. Vérifiez OPENROUTER_API_KEY.' }, { status: 500 });
    }
    if (error.status === 429) {
      return NextResponse.json({ error: 'Limite de requêtes atteinte. Réessayez dans quelques instants.' }, { status: 429 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
