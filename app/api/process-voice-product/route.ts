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
    const userId = formData.get('user_id') as string | null;

    if (!audio) return NextResponse.json({ error: 'No audio file' }, { status: 400 });

    // Transcription with Groq Whisper
    const transcription = await groq.audio.transcriptions.create({
      file: audio,
      model: 'whisper-large-v3-turbo',
      language: 'fr',
    });
    const transcript = transcription.text;

    const systemPrompt = `Tu es un assistant expert en gestion de produits et articles.
L'utilisateur vient de dicter un produit ou un article à voix haute. Extrais les informations et retourne UNIQUEMENT du JSON valide.

Format attendu:
{
  "name": "string — nom du produit",
  "description": "string — description détaillée",
  "reference": "string ou null — référence du produit",
  "unit_price": "number — prix HT sous forme de nombre",
  "vatRate": "number — taux de TVA (par défaut 20)",
  "quantity": "number ou null — quantité par défaut (1 pour unité)",
  "unit": "string ou null — unité (unit, hour, day, month, kg, km, forfait)",
  "category": "string — détecte automatiquement la catégorie (service, product, software, consulting, other)"
}

Règles ABSOLUES pour la CATÉGORIE :
- Analyse les mots-clés pour détecter automatiquement la catégorie :
  - "software" → Mots: logiciel, application, app, saas, logiciel, programme, solution informatique
  - "consulting" → Mots: conseil, consulting, audit, expertise, accompagnement, stratégie, formation
  - "service" → Mots: service, prestation, maintenance, support, hébergement, abonnement
  - "product" → Mots: produit, matériel, article, équipement, device, hardware, objet
  - "other" → Si aucun mot-clé ne correspond
- La catégorie doit TOUJOURS être l'une de ces valeurs: "service", "product", "software", "consulting", "other"

Règles ABSOLUES :
- NE JAMAIS recopier mot pour mot ce que l'utilisateur a dit
- Rédige une description PROFESSIONNELLE et COMMERCIALE
- La description doit être claire, professionnelle, entre 5 et 15 mots
- unit_price est TOUJOURS HT (hors taxes) - DOIT être un nombre
- vatRate par défaut = 20 - DOIT être un nombre
- quantity représente la quantité par défaut, généralement 1 ou null
- Les valeurs unit possibles : "unit", "hour", "day", "month", "kg", "km", "forfait"

Exemples de détection de catégorie :
- "Développement d'une application mobile" → category: "software"
- "Conseil en stratégie digitale" → category: "consulting"
- "Maintenance informatique" → category: "service"
- "Vente de matériel informatique" → category: "product"
- "Formation équipe vente" → category: "consulting"
- "Abonnement mensuel SaaS" → category: "software"`;

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
      console.error('[process-voice-product] Failed to parse AI response:', err);
      parsed = {};
    }

    return NextResponse.json({ transcript, parsed });
  } catch (error: any) {
    console.error('[Process Voice Product] Error:', error);
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
