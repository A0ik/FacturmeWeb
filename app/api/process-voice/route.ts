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

    if (!audio) return NextResponse.json({ error: 'No audio file' }, { status: 400 });

    // Transcription with Groq Whisper
    const transcription = await groq.audio.transcriptions.create({
      file: audio,
      model: 'whisper-large-v3-turbo',
      language: 'fr',
    });
    const transcript = transcription.text;

    // Parse with LLM
    const sectorHint = sector ? `L'utilisateur travaille dans le secteur : ${sector}.` : '';
    const systemPrompt = `Tu es un assistant de facturation. ${sectorHint}
Extrais les informations suivantes du texte dicté et retourne UNIQUEMENT du JSON valide.
Format attendu:
{
  "client_name": "string ou null",
  "items": [{"description": "string", "quantity": number, "unit_price": number, "vat_rate": number}],
  "due_days": number,
  "notes": "string ou null"
}
Règles:
- unit_price est toujours HT (hors taxes)
- vat_rate par défaut = 20
- due_days = délai de paiement en jours (30 par défaut)
- Si le montant est TTC, calcule le HT en divisant par (1 + vat_rate/100)`;

    const completion = await openrouter.chat.completions.create({
      model: 'mistralai/mistral-small-24b-instruct-2501',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript },
      ],
      response_format: { type: 'json_object' },
    });

    let parsed = {};
    try {
      parsed = JSON.parse(completion.choices[0].message.content || '{}');
    } catch (err) {
      console.error('[process-voice] Failed to parse AI response:', err);
      parsed = {};
    }

    return NextResponse.json({ transcript, parsed });
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
