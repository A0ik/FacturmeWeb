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
    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY
    });

    const formData = await req.formData();
    const audio = formData.get('audio') as File;
    const contract_type = formData.get('contract_type') as string;

    if (!audio) {
      return NextResponse.json({ error: 'No audio file' }, { status: 400 });
    }

    // Transcription with Groq Whisper (auto-detect language - supports Arabic and French)
    const transcription = await groq.audio.transcriptions.create({
      file: audio,
      model: 'whisper-large-v3-turbo',
      // language: 'fr', // Removed - auto-detect to support Arabic
    });
    const rawTranscript = transcription.text;

    // Translate Arabic (any dialect) to French if needed
    const { transcript, wasTranslated, originalLanguage } = await processVoiceTranscript(rawTranscript);

    console.log(`[process-voice-contract] Language detected: ${originalLanguage}${wasTranslated ? ' (translated)' : ''}`);

    // System prompt based on contract type
    const systemPrompts: Record<string, string> = {
      cdd: `Tu es un assistant expert en contrats de travail français, spécialisé dans les CDD (Contrat à Durée Déterminée).
L'utilisateur dicte des informations pour un contrat CDD. Extrais et retourne UNIQUEMENT du JSON valide.

Format attendu (null si non mentionné) :
{
  "employeeFirstName": "string ou null",
  "employeeLastName": "string ou null",
  "employeeEmail": "string ou null",
  "employeePhone": "string ou null",
  "contractStartDate": "string ou null (format YYYY-MM-DD)",
  "contractEndDate": "string ou null (format YYYY-MM-DD)",
  "trialPeriodDays": "string ou null",
  "jobTitle": "string ou null",
  "workLocation": "string ou null",
  "salaryAmount": "string ou null",
  "salaryFrequency": "monthly ou hourly ou null",
  "contractReason": "remplacement, accroisse, saisonnier, ou usage - null si non dit",
  "replacedEmployeeName": "string ou null (si remplacement)",
  "companyName": "string ou null",
  "companyAddress": "string ou null",
  "companySiret": "string ou null",
  "employerName": "string ou null"
}

Exemple : "Je veux embauche Marie Dupont comme développeuse web à Paris pour remplacer Jean durant 6 mois à 3000 euros par mois"
→ {
  "employeeFirstName": "Marie",
  "employeeLastName": "Dupont",
  "jobTitle": "Développeuse web",
  "workLocation": "Paris",
  "contractReason": "remplacement",
  "replacedEmployeeName": "Jean",
  "salaryAmount": "3000",
  "salaryFrequency": "monthly"
}`,

      cdi: `Tu es un assistant expert en contrats de travail français, spécialisé dans les CDI (Contrat à Durée Indéterminée).
L'utilisateur dicte des informations pour un contrat CDI. Extrais et retourne UNIQUEMENT du JSON valide.

Format attendu (null si non mentionné) :
{
  "employeeFirstName": "string ou null",
  "employeeLastName": "string ou null",
  "employeeEmail": "string ou null",
  "employeePhone": "string ou null",
  "contractStartDate": "string ou null (format YYYY-MM-DD)",
  "trialPeriodDays": "string ou null",
  "jobTitle": "string ou null",
  "workLocation": "string ou null",
  "salaryAmount": "string ou null",
  "salaryFrequency": "monthly ou hourly ou null",
  "contractClassification": "string ou null",
  "workingHours": "string ou null",
  "companyName": "string ou null",
  "companySiret": "string ou null",
  "employerName": "string ou null"
}`,

      other: `Tu es un assistant expert en contrats de travail français.
L'utilisateur dicte des informations pour un contrat (stage, freelance, etc.). Extrais et retourne UNIQUEMENT du JSON valide.

Format attendu (null si non mentionné) :
{
  "contractCategory": "stage, freelance, temp_work, apprenticeship, professionalization, ou other - détecte automatiquement",
  "contractTitle": "string ou null",
  "durationWeeks": "string ou null",
  "startDate": "string ou null (format YYYY-MM-DD)",
  "endDate": "string ou null (format YYYY-MM-DD)",
  "employeeFirstName": "string ou null",
  "employeeLastName": "string ou null",
  "employeeEmail": "string ou null",
  "employeePhone": "string ou null",
  "companyName": "string ou null",
  "salaryAmount": "string ou null",
  "salaryFrequency": "monthly, hourly, weekly, ou flat_rate",
  "tutorName": "string ou null",
  "schoolName": "string ou null",
  "speciality": "string ou null"
}

Détection automatique de contractCategory :
- "stage" → mots: stage, stagiaire, convention de stage
- "freelance" → mots: freelance, prestataire, prestation, consultant
- "temp_work" → mots: intérim, intérimaire, mission temporaire
- "apprenticeship" → mots: apprentissage, apprenti
- "professionalization" → mots: professionnalisation`
    };

    const systemPrompt = systemPrompts[contract_type] || systemPrompts.other;

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
      console.error('[process-voice-contract] Failed to parse AI response:', err);
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
    console.error('[Process Voice Contract] Error:', error);
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
