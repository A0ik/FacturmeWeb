import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'Configuration IA manquante (OPENROUTER_API_KEY)' }, { status: 500 });
    }

    const { text, contract_type } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Texte manquant' }, { status: 400 });
    }

    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY
    });

    // System prompts for different contract types
    const systemPrompts: Record<string, string> = {
      cdd: `Tu es un assistant expert en contrats de travail français, spécialisé dans les CDD.
À partir du texte fourni, extrait les informations pertinentes pour un contrat CDD.

IMPORTANT - Numéro de Sécurité sociale:
- Cherche les formats: 15 chiffres, X XX XX XX XXX XXX XX, ou avec clés (2 chiffres à la fin)
- Peut être écrit: NIR, numéro Sécu, sécurité sociale, SS
- Exemples: 185012345678912, 1 85 01 23 456 789 12, 18501234567891234 (avec clé)

IMPORTANT - Nationalité:
- Cherche: nationalité, de nationalité, Français(e), Française, étranger, etc.
- Valeurs courantes: Française, Marocaine, Algérienne, Tunisienne, Italienne, Espagnole, Portugaise, etc.

IMPORTANT - Dates de contrat:
- Cherche: date de début, date de fin, début du contrat, fin du contrat, durée
- Formats acceptés: JJ/MM/AAAA, JJ-MM-AAAA, en toutes lettres, "à compter du", "jusqu'au"
- Convertis toujours au format YYYY-MM-DD

Format JSON attendu (null si non trouvé) :
{
  "employeeFirstName": "string ou null",
  "employeeLastName": "string ou null",
  "employeeEmail": "string ou null",
  "employeePhone": "string ou null",
  "employeeAddress": "string ou null",
  "employeePostalCode": "string ou null",
  "employeeCity": "string ou null",
  "employeeBirthDate": "string ou null (YYYY-MM-DD)",
  "employeeSocialSecurity": "string ou null (15 chiffres, sans espaces ni tirets)",
  "employeeNationality": "string ou null",
  "contractStartDate": "string ou null (YYYY-MM-DD)",
  "contractEndDate": "string ou null (YYYY-MM-DD)",
  "trialPeriodDays": "string ou null",
  "jobTitle": "string ou null",
  "workLocation": "string ou null",
  "workSchedule": "string ou null",
  "salaryAmount": "string ou null",
  "salaryFrequency": "monthly ou hourly ou null",
  "contractReason": "remplacement, accroisse, saisonnier, ou usage",
  "replacedEmployeeName": "string ou null",
  "companyName": "string ou null",
  "companyAddress": "string ou null",
  "companyPostalCode": "string ou null",
  "companyCity": "string ou null",
  "companySiret": "string ou null",
  "employerName": "string ou null",
  "employerTitle": "string ou null"
}`,

      cdi: `Tu es un assistant expert en contrats de travail français, spécialisé dans les CDI.
À partir du texte fourni, extrait les informations pertinentes pour un contrat CDI.

IMPORTANT - Numéro de Sécurité sociale:
- Cherche les formats: 15 chiffres, X XX XX XX XXX XXX XX, ou avec clés (2 chiffres à la fin)
- Peut être écrit: NIR, numéro Sécu, sécurité sociale, SS
- Exemples: 185012345678912, 1 85 01 23 456 789 12, 18501234567891234 (avec clé)

IMPORTANT - Nationalité:
- Cherche: nationalité, de nationalité, Français(e), Française, étranger, etc.
- Valeurs courantes: Française, Marocaine, Algérienne, Tunisienne, Italienne, Espagnole, Portugaise, etc.

IMPORTANT - Dates de contrat:
- Cherche: date de début, début du contrat, prise de fonction, à compter du
- Formats acceptés: JJ/MM/AAAA, JJ-MM-AAAA, en toutes lettres
- Convertis toujours au format YYYY-MM-DD

Format JSON attendu (null si non trouvé) :
{
  "employeeFirstName": "string ou null",
  "employeeLastName": "string ou null",
  "employeeEmail": "string ou null",
  "employeePhone": "string ou null",
  "employeeAddress": "string ou null",
  "employeePostalCode": "string ou null",
  "employeeCity": "string ou null",
  "employeeBirthDate": "string ou null (YYYY-MM-DD)",
  "employeeSocialSecurity": "string ou null (15 chiffres, sans espaces ni tirets)",
  "employeeNationality": "string ou null",
  "employeeQualification": "string ou null",
  "contractStartDate": "string ou null (YYYY-MM-DD)",
  "trialPeriodDays": "string ou null",
  "jobTitle": "string ou null",
  "workLocation": "string ou null",
  "workSchedule": "string ou null",
  "salaryAmount": "string ou null",
  "salaryFrequency": "monthly ou hourly ou null",
  "contractClassification": "string ou null",
  "workingHours": "string ou null",
  "companyName": "string ou null",
  "companyAddress": "string ou null",
  "companyPostalCode": "string ou null",
  "companyCity": "string ou null",
  "companySiret": "string ou null",
  "employerName": "string ou null",
  "employerTitle": "string ou null",
  "collectiveAgreement": "string ou null",
  "probationClause": "boolean ou null",
  "nonCompeteClause": "boolean ou null",
  "mobilityClause": "boolean ou null"
}`,

      other: `Tu es un assistant expert en contrats de travail français.
À partir du texte fourni, extrait les informations pertinentes pour un contrat.

Format JSON attendu (null si non trouvé) :
{
  "contractCategory": "stage, freelance, temp_work, apprenticeship, professionalization, ou other",
  "contractTitle": "string ou null",
  "durationWeeks": "string ou null",
  "startDate": "string ou null (YYYY-MM-DD)",
  "endDate": "string ou null (YYYY-MM-DD)",
  "employeeFirstName": "string ou null",
  "employeeLastName": "string ou null",
  "employeeEmail": "string ou null",
  "employeePhone": "string ou null",
  "employeeAddress": "string ou null",
  "companyName": "string ou null",
  "companyAddress": "string ou null",
  "companySiret": "string ou null",
  "employerName": "string ou null",
  "salaryAmount": "string ou null",
  "salaryFrequency": "monthly, hourly, weekly, ou flat_rate",
  "tutorName": "string ou null",
  "schoolName": "string ou null",
  "speciality": "string ou null",
  "objectives": "string ou null",
  "tasks": "string ou null"
}`
    };

    const systemPrompt = systemPrompts[contract_type] || systemPrompts.other;

    const completion = await openrouter.chat.completions.create({
      // Modèle performant et moins cher sur OpenRouter : Gemma 3 27B
      // Coût: ~0.10€/M tokens vs ~0.30€/M pour Mistral Small
      // Performance: Excellente pour le français et les tâches structurées
      model: 'google/gemma-3-27b-it',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 1500,
    });

    let parsed: any = {};
    try {
      parsed = JSON.parse(completion.choices[0].message.content || '{}');
    } catch (err) {
      console.error('[process-text-contract] Failed to parse AI response:', err);
      parsed = {};
    }

    return NextResponse.json({ parsed });

  } catch (error: any) {
    console.error('[Process Text Contract] Error:', error);
    const message = error.message || 'Erreur lors du traitement du texte';

    if (error.status === 401 || error.status === 403) {
      return NextResponse.json({ error: 'Clé API invalide. Vérifiez OPENROUTER_API_KEY.' }, { status: 500 });
    }
    if (error.status === 429) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans quelques instants.' }, { status: 429 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
