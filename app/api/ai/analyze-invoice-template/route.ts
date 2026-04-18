import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'Configuration IA manquante (OPENROUTER_API_KEY)' }, { status: 500 });
    }

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
      model: 'google/gemini-2.0-flash-exp',
      messages: [
        {
          role: 'system',
          content: `You are an expert at analyzing invoice designs and creating pixel-perfect HTML/CSS templates.
Your goal is to create templates that can be exactly reproduced each time. You must retain ALL visual details.

When analyzing an invoice, you MUST identify and remember:
1. EXACT color palette (primary, secondary, accent, text colors, backgrounds, borders)
2. Font choices (family, sizes, weights for every text element)
3. Spacing and padding (margins, gaps, line heights for every section)
4. Layout structure (flex/grid positioning, column widths, alignment rules)
5. Border styles (thickness, color, radius, style for every element)
6. Header/footer design (exact height, content positioning, decorative elements)
7. Table design (column widths, row heights, alternating colors, header style)
8. Box/card designs (shadows, backgrounds, border radii)
9. Icon/badge styles (sizes, colors, positioning)
10. Overall page margins and content width

Create a complete HTML template that replicates the invoice's visual style as closely as possible.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyse cette facture EN DETAIL et cree un template HTML qui reproduit EXACTEMENT son style visuel. Tu dois retenir TOUS les details visuels.

Le template DOIT utiliser ces variables placeholder:
- {{accent_color}} pour la couleur principale
- {{company_name}}, {{company_address}}, {{company_logo}}, {{company_phone}}, {{company_email}}, {{company_siret}}, {{company_vat_number}}, {{company_legal_status}}
- {{doc_label}}, {{invoice_number}}
- {{issue_date}}, {{due_date}}, {{issued_label}}
- {{client_name}}, {{client_address}}, {{client_email}}, {{client_phone}}, {{client_siret}}, {{billed_to_label}}
- {{items_table}} pour les lignes du tableau (HTML pre-genere)
- {{subtotal}}, {{vat_amount}}, {{discount_amount}}, {{discount_percent}}, {{total}}, {{total_label}}
- {{notes}}, {{notes_block}}
- {{bank_block}}, {{payment_section}}, {{payment_terms_block}}, {{legal_mention_block}}
- {{signature_block}}, {{signature_image}}, {{watermark}}
- {{currency}}, {{language}}, {{qrcode_block}}

Contraintes IMPORTANTES:
- CSS inline uniquement (pas de stylesheets externes)
- Utiliser des fonts web-safe (Helvetica, Arial, Georgia, serif)
- Doit imprimer correctement en format A4
- Inclure @page { margin: 0; size: A4 } dans le style
- Largeur max appropriee pour impression A4 (environ 595px)
- Le HTML doit etre complet (DOCTYPE, html, head, body)
- Le numero de facture {{invoice_number}} doit apparaitre en BAS du document dans le footer, PAS dans le header
- Le logo {{company_logo}} doit etre grand et visible en haut du document
- Les conditions de paiement doivent etre detaillees avec un message legal professionnel
- Les mentions legales doivent etre completes (SIRET, TVA, penalites de retard, indemnite forfaitaire)

Retourne UNIQUEMENT du JSON valide avec ces champs OBLIGATOIRES:
{
  "template_html": "string HTML complet du template avec TOUS les details visuels retenus",
  "accent_color": "#hex couleur principale extraite de la facture",
  "style_description": "description detaillee du style identifie (couleurs, fonts, layout, etc.)",
  "font_family": "font principale identifiee",
  "font_size_base": "taille de base en px",
  "border_radius": "arrondi des coins en px",
  "header_height": "hauteur du header en px",
  "spacing": "espacement principal en px",
  "color_secondary": "#hex couleur secondaire",
  "color_background": "#hex couleur de fond",
  "color_text": "#hex couleur du texte principal"
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
      max_tokens: 12000,
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
      style_description: result.style_description || 'Style personnalise',
      font_family: result.font_family || 'Helvetica',
      font_size_base: result.font_size_base || '13px',
      border_radius: result.border_radius || '8px',
      header_height: result.header_height || 'auto',
      spacing: result.spacing || '16px',
      color_secondary: result.color_secondary || '#6b7280',
      color_background: result.color_background || '#ffffff',
      color_text: result.color_text || '#1a1a2e',
    });
  } catch (error: any) {
    console.error('[Analyze Invoice Template] Error:', error);
    const message = error.message || 'Erreur lors de l\'analyse du modèle';
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json({ error: 'Clé API invalide. Vérifiez OPENROUTER_API_KEY.' }, { status: 500 });
    }
    if (error.status === 429) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez dans quelques instants.' }, { status: 429 });
    }
    if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
      return NextResponse.json({ error: 'Le délai d\'analyse a été dépassé. Réessayez avec un fichier plus léger.' }, { status: 504 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
