import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const { vendor, description } = await req.json();

    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const completion = await openrouter.chat.completions.create({
      model: 'mistralai/mistral-small-24b-instruct-2501',
      messages: [
        {
          role: 'system',
          content: `Tu es un assistant comptable. Catégorise cette dépense professionnelle.
Catégories disponibles: transport, meals, accommodation, equipment, office, shopping, other
Retourne UNIQUEMENT du JSON: {"category": "string", "confidence": number (0-1)}`,
        },
        {
          role: 'user',
          content: `Fournisseur: ${vendor || ''}${description ? `. Description: ${description}` : ''}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    let result: any = { category: 'other', confidence: 0 };
    try {
      result = JSON.parse(completion.choices[0].message.content || '{}');
    } catch (err) {
      console.error('[categorize-expense] Failed to parse AI response:', err);
      result = { category: 'other', confidence: 0 };
    }

    const VALID = ['transport', 'meals', 'accommodation', 'equipment', 'office', 'shopping', 'other'];
    if (!VALID.includes(result.category)) result.category = 'other';

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
