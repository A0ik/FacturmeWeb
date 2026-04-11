import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createAdminClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) return NextResponse.json({ error: 'file and userId required' }, { status: 400 });

    const openrouter = new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: process.env.OPENROUTER_API_KEY });
    const text = await file.text();

    const completion = await openrouter.chat.completions.create({
      model: 'mistralai/mistral-small-24b-instruct-2501',
      messages: [
        {
          role: 'system',
          content: 'Tu es un assistant d\'import de clients. Extrais les informations de clients du texte fourni et retourne UNIQUEMENT un JSON valide avec un tableau "clients". Chaque client a: name (requis), email, phone, address, city, zip, country, siret, vat_number.',
        },
        { role: 'user', content: text.slice(0, 8000) },
      ],
      response_format: { type: 'json_object' },
    });

    let parsed: { clients?: any[] } = {};
    try {
      parsed = JSON.parse(completion.choices[0].message.content || '{}');
    } catch (err) {
      console.error('[import-clients] Failed to parse AI response:', err);
      parsed = {};
    }

    const clients = parsed.clients || [];
    if (clients.length === 0) return NextResponse.json({ imported: 0 });

    const supabase = createAdminClient();
    const toInsert = clients.filter((c) => c.name).map((c) => ({ ...c, user_id: userId }));

    const { data, error } = await supabase.from('clients').insert(toInsert).select();
    if (error) throw error;

    return NextResponse.json({ imported: data?.length || 0, clients: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
