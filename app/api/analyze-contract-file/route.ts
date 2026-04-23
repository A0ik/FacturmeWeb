import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'Configuration IA manquante (OPENROUTER_API_KEY)' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    // Read file content
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // For image files, we'd use vision. For documents, extract text
    let fileContent = '';
    const fileType = file.type;

    if (fileType.includes('image')) {
      // For images, we could use vision API
      fileContent = '[Image file - would require vision API for OCR]';
    } else if (fileType.includes('pdf') || fileType.includes('text') || fileType.includes('document')) {
      // For documents, you'd use a PDF parser
      // For now, we'll ask AI to analyze based on filename and context
      fileContent = `[Document: ${file.name}]`;
    }

    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY
    });

    const systemPrompt = `Tu es un assistant expert en extraction de données depuis des documents administratifs français.
Ton objectif est d'extraire les informations pertinentes pour un contrat de travail (CDD, CDI, ou autre).

À partir du contenu du document (ou du nom du fichier si le contenu n'est pas disponible), extrais et retourne UNIQUEMENT du JSON valide.

Format attendu (null si non trouvé):
{
  "employeeFirstName": "string ou null",
  "employeeLastName": "string ou null",
  "employeeAddress": "string ou null",
  "employeePostalCode": "string ou null",
  "employeeCity": "string ou null",
  "employeeEmail": "string ou null",
  "employeePhone": "string ou null",
  "employeeBirthDate": "string ou null (format YYYY-MM-DD)",
  "employeeSocialSecurity": "string ou null",
  "employeeNationality": "string ou null",
  "contractStartDate": "string ou null (format YYYY-MM-DD)",
  "contractEndDate": "string ou null (format YYYY-MM-DD)",
  "trialPeriodDays": "number ou null",
  "jobTitle": "string ou null",
  "workLocation": "string ou null",
  "salaryAmount": "number ou null",
  "salaryFrequency": "monthly ou hourly ou null",
  "companyName": "string ou null",
  "companyAddress": "string ou null",
  "companyPostalCode": "string ou null",
  "companyCity": "string ou null",
  "companySiret": "string ou null",
  "employerName": "string ou null",
  "contractReason": "string ou null (pour CDD)",
  "replacedEmployeeName": "string ou null",
  "contractClassification": "string ou null (pour CDI)",
  "workingHours": "string ou null"
}

Règles :
- Si une information n'est pas présente, mets null
- Les dates doivent être au format YYYY-MM-DD
- Les montants doivent être des nombres (sans le symbole €)
- Sois précis dans l'extraction des noms et adresses`;

    const completion = await openrouter.chat.completions.create({
      model: 'mistralai/mistral-small-24b-instruct-2501',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyse ce document et extrait les informations : ${fileContent}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    let parsed: any = {};
    try {
      parsed = JSON.parse(completion.choices[0].message.content || '{}');
    } catch (err) {
      console.error('[analyze-contract-file] Failed to parse AI response:', err);
      parsed = {};
    }

    return NextResponse.json({
      extractedData: parsed,
      fileName: file.name,
      fileType: file.type
    });

  } catch (error: any) {
    console.error('[Analyze Contract File] Error:', error);
    const message = error.message || 'Erreur lors de l\'analyse du fichier';

    if (error.status === 401 || error.status === 403) {
      return NextResponse.json({ error: 'Clé API invalide. Vérifiez OPENROUTER_API_KEY.' }, { status: 500 });
    }
    if (error.status === 429) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans quelques instants.' }, { status: 429 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
