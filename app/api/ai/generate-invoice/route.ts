import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const { prompt, sector } = await req.json();
    if (!prompt?.trim()) return NextResponse.json({ error: 'Prompt requis' }, { status: 400 });

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'Configuration IA manquante (OPENROUTER_API_KEY)' }, { status: 500 });
    }

    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const sectorHint = sector ? `L'utilisateur travaille dans le secteur : ${sector}.` : '';
    const systemPrompt = `Tu es un assistant expert en facturation française. ${sectorHint}
L'utilisateur décrit en langage naturel ce qu'il veut facturer.
Extrais les informations et retourne UNIQUEMENT du JSON valide.

Format attendu:
{
  "client_name": "string ou null",
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
- discount_percent = remise globale en % (0 si non mentionné)
- Si un montant TTC est mentionné, convertis en HT : HT = TTC / (1 + vat_rate/100)
- Génère des descriptions de prestations professionnelles et détaillées
- Si l'utilisateur ne mentionne pas de quantité, utilise 1
- Si l'utilisateur mentionne un forfait/projet, crée 1 ligne
- Si l'utilisateur mentionne plusieurs prestations, crée autant de lignes
- Assure-toi que les prix sont raisonnables et cohérents avec le marché français`;

    const completion = await openrouter.chat.completions.create({
      model: 'mistralai/mistral-small-24b-instruct-2501',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    let parsed: any = {};
    try {
      parsed = JSON.parse(completion.choices[0].message.content || '{}');
    } catch {
      return NextResponse.json({ error: 'Erreur parsing IA' }, { status: 500 });
    }

    return NextResponse.json({ parsed });
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
