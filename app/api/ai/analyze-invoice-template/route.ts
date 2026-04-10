import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type || 'image/jpeg';

    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const completion = await openrouter.chat.completions.create({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `You are an expert at analyzing invoice designs and creating HTML/CSS templates.
Analyze the uploaded invoice image carefully and create a complete HTML template that replicates its visual style as closely as possible.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyse cette facture et crée un template HTML qui reproduit son style visuel. Le template DOIT utiliser ces variables placeholder:
- {{accent_color}} pour la couleur principale
- {{company_name}}, {{company_address}}, {{company_logo}}, {{company_phone}}, {{company_siret}}
- {{doc_label}}, {{invoice_number}}
- {{issue_date}}, {{due_date}}, {{issued_label}}
- {{client_name}}, {{client_address}}, {{client_email}}, {{billed_to_label}}
- {{items_table}} pour les lignes du tableau (HTML pré-généré)
- {{subtotal}}, {{vat_amount}}, {{total}}, {{total_label}}
- {{notes}}, {{notes_block}}
- {{bank_block}}, {{payment_section}}, {{legal_mention}}
- {{signature_block}}, {{signature_image}}, {{watermark}}
- {{currency}}, {{language}}

Contraintes:
- CSS inline uniquement (pas de stylesheets externes)
- Utiliser des fonts web-safe (Helvetica, Arial, Georgia, serif)
- Doit imprimer correctement en format A4
- Inclure @page { margin: 0; size: A4 } dans le style
- Largeur max appropriée pour impression A4
- Le HTML doit être complet (DOCTYPE, html, head, body)

Retourne UNIQUEMENT du JSON valide:
{
  "template_html": "string HTML complet du template",
  "accent_color": "#hex color extraite de la facture",
  "style_description": "description courte du style identifié"
}`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 8000,
    });

    let result: any = {};
    try {
      result = JSON.parse(completion.choices[0].message.content || '{}');
    } catch {
      return NextResponse.json({ error: 'Impossible de générer le template' }, { status: 500 });
    }

    if (!result.template_html) {
      return NextResponse.json({ error: 'Template non généré' }, { status: 500 });
    }

    return NextResponse.json({
      template_html: result.template_html,
      accent_color: result.accent_color || '#1D9E75',
      style_description: result.style_description || 'Style personnalisé',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
