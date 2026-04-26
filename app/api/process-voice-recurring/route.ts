import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { processVoiceTranscript } from '@/lib/groq-translator';

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

    // Transcription with Groq Whisper (auto-detect language - supports Arabic and French)
    const transcription = await groq.audio.transcriptions.create({
      file: audio,
      model: 'whisper-large-v3-turbo',
      // language: 'fr', // Removed - auto-detect to support Arabic
    });
    const rawTranscript = transcription.text;

    // Translate Arabic (any dialect) to French if needed
    const { transcript, wasTranslated, originalLanguage } = await processVoiceTranscript(rawTranscript);

    console.log(`[process-voice-recurring] Language detected: ${originalLanguage}${wasTranslated ? ' (translated)' : ''}`);

    const systemPrompt = `Tu es un assistant expert en facturation récurrente française.
L'utilisateur vient de dicter une facture récurrente à voix haute. Extrais les informations et retourne UNIQUEMENT du JSON valide.

Format attendu:
{
  "client_name": "string ou null — nom du client",
  "frequency": "hebdomadaire" | "mensuel" | "trimestrielle" | "annuelle" | null,
  "start_date": "string ou null — format YYYY-MM-DD ou utilise la date d'aujourd'hui + 1 mois par défaut",
  "email_subject": "string ou null — sujet personnalisé pour l'email",
  "email_message": "string ou null — message personnalisé pour l'email",
  "items": [
    {
      "name": "string — nom de l'article",
      "description": "string — description",
      "quantity": number,
      "unit_price": number,
      "vat_rate": number
    }
  ],
  "total_amount": number ou null — montant total mentionné
}

Règles ABSOLUES :
- NE JAMAIS recopier mot pour mot ce que l'utilisateur a dit
- Rédige une description PROFESSIONNELLE et COMMERCIALE pour chaque article
- La description doit être claire, professionnelle, entre 3 et 10 mots
- unit_price est TOUJOURS HT (hors taxes)
- vat_rate par défaut = 20
- quantity par défaut = 1
- frequency: analyse "chaque semaine", "par mois", "tous les 3 mois", "par an", "mensuel", "hebdomadaire"
- start_date: extrais la date de début mentionnée, sinon utilise null
- email_subject: génère un sujet professionnel comme "Votre facture [MENSUELLE/HEBDOMADAIRE] - [Nom du client]" si un client est mentionné
- email_message: génère un message professionnel personnalisé avec le nom du client, ex: "Bonjour {{client_name}},\n\nVeuillez trouver ci-joint votre facture [MENSUELLE/HEBDOMADAIRE].Cette facture concerne : [liste des articles avec descriptions].\n\nLe montant total de cette facture est de [montant]€ HT.\n\nNous restons à votre disposition pour toute question.\n\nCordialement."
- Si plusieurs articles sont mentionnés, retourne-les tous dans le tableau items
- Si un montant total est mentionné, calcule le montant unitaire si nécessaire

Exemple de réponse attendue si l'utilisateur dit "facture mensuelle pour Action, site web 800€":
{
  "client_name": "Action",
  "frequency": "mensuel",
  "start_date": null,
  "email_subject": "Votre facture mensuelle - Action",
  "email_message": "Bonjour {{client_name}},\\n\\nVeuillez trouver ci-joint votre facture mensuelle.\\n\\nCette facture concerne : Site web - 800€ HT.\\n\\nLe montant total de cette facture est de 800€ HT.\\n\\nNous restons à votre disposition pour toute question.\\n\\nCordialement.",
  "items": [
    {
      "name": "Site web",
      "description": "Conception et développement de site web",
      "quantity": 1,
      "unit_price": 800,
      "vat_rate": 20
    }
  ],
  "total_amount": 800
}`;

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
      console.error('[process-voice-recurring] Failed to parse AI response:', err);
      parsed = {};
    }

    return NextResponse.json({
      transcript,
      originalTranscript: rawTranscript,
      wasTranslated,
      originalLanguage,
      parsed
    });
  } catch (error: any) {
    console.error('[Process Voice Recurring] Error:', error);
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
