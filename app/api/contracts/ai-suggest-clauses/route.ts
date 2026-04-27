import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'Configuration IA manquante (OPENROUTER_API_KEY)' }, { status: 500 });
    }

    const { sector, contractType, specificNeeds } = await req.json();

    if (!sector || !contractType) {
      return NextResponse.json(
        { error: 'Paramètres manquants: sector et contractType sont requis' },
        { status: 400 }
      );
    }

    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY
    });

    // System prompt optimisé pour les suggestions de clauses
    const systemPrompt = `Tu es un expert juriste français spécialisé en droit du travail, chargé de suggérer des clauses de contrat adaptées au secteur d'activité.

Ton rôle :
1. Suggérer 3 à 5 clauses pertinentes pour le secteur et le type de contrat
2. Expliquer pourquoi chaque clause est importante pour ce secteur
3. Indiquer les mentions obligatoires spécifiques au secteur
4. Proposer des formulations conformes au Code du travail français

Format de réponse JSON obligatoire :
{
  "suggestions": [
    {
      "titre": "Titre de la clause",
      "categorie": "essai|travail|remuneration|confidentialite|non_concurrence|mobilite|formation|rupture",
      "contenu": "Contenu de la clause (formulation juridique précise)",
      "obligatoire": true|false,
      "raison": "Pourquoi cette clause est importante pour ce secteur",
      "referencesLegales": ["Article XXX du Code du travail", "Convention collective XXX"]
    }
  ],
  "mentionsObligatoires": [
    "Mention obligatoire 1",
    "Mention obligatoire 2"
  ],
  "risquesJuridiques": [
    "Risque potentiel à couvrir"
  ]
}

Secteurs courants et leurs spécificités :
- BTP/Bâtiment : carte BTP, caisse des congés payés, primes de risque, formation sécurité
- Restauration/Horeca : horaires décalés, travail dimanche, pourboires
- Informatique/Syntec : forfait jours, télétravail, clause de non-concurrence plus fréquente
- Santé : vaccinations obligatoires, astreintes, temps partiel thérapeutique
- Commerce : travail dimanche, heures sup, saisonnalité
- Métallurgie : travail 3x8, prime de risque, classifications spécifiques

IMPORTANT : Ne JAMAIS inventer d'articles de loi. Citer uniquement des articles réels du Code du travail ou des conventions collectives existantes.`;

    const userPrompt = `Secteur : ${sector}
Type de contrat : ${contractType}
${specificNeeds ? `Besoins spécifiques : ${specificNeeds}` : ''}

Suggère les clauses les plus pertinentes pour ce contrat.`;

    const completion = await openrouter.chat.completions.create({
      // Modèle performant et moins cher sur OpenRouter
      model: 'google/gemma-3-27b-it', // Ou 'microsoft/phi-3-medium-128k-instruct'
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000
    });

    let suggestions: any;
    try {
      suggestions = JSON.parse(completion.choices[0].message.content || '{}');
    } catch (err) {
      console.error('[Clauses AI] Failed to parse response:', err);
      suggestions = {
        suggestions: [],
        mentionsObligatoires: [],
        risquesJuridiques: []
      };
    }

    return NextResponse.json(suggestions);
  } catch (error: any) {
    console.error('[Clauses AI] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la génération des suggestions' },
      { status: 500 }
    );
  }
}
