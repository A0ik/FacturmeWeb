import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// POST — Save SumUp API key and merchant code
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cs: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options as any)); },
        },
      }
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { apiKey, merchantCode } = await req.json();
    if (!apiKey || !merchantCode) {
      return NextResponse.json({ error: 'Clé API et code marchand requis' }, { status: 400 });
    }

    // Validation basique - plus permissive sur le format de clé
    const trimmedKey = apiKey.trim();
    const trimmedCode = merchantCode.trim();

    if (trimmedKey.length < 10) {
      return NextResponse.json({ error: 'Clé API trop courte (minimum 10 caractères)' }, { status: 400 });
    }

    if (trimmedCode.length < 3) {
      return NextResponse.json({ error: 'Code marchand invalide (trop court)' }, { status: 400 });
    }

    console.log('[sumup-connect] Attempting connection for merchant:', trimmedCode);

    // Sauvegarder les credentials dans la base de données
    const supabase = createAdminClient();
    const { error: updateError } = await supabase.from('profiles')
      .update({ sumup_api_key: trimmedKey, sumup_merchant_code: trimmedCode })
      .eq('id', user.id);

    if (updateError) {
      console.error('[sumup-connect] Database update error:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la sauvegarde des credentials' }, { status: 500 });
    }

    // Tenter de valider via l'API SumUp (non-bloquant pour la connexion)
    let validationSuccess = false;
    let merchantName: string | null = null;
    try {
      const res = await fetch(`https://api.sumup.com/v0.1/merchants/${trimmedCode}/profile`, {
        headers: { Authorization: `Bearer ${trimmedKey}` },
        signal: AbortSignal.timeout(10000), // Timeout de 10 secondes
      });

      if (res.ok) {
        const data = await res.json();
        validationSuccess = true;
        merchantName = data.company_name || data.merchant_code || trimmedCode;
        console.log('[sumup-connect] Successfully validated SumUp credentials');
      } else {
        console.warn('[sumup-connect] API validation failed (continuing anyway):', res.status);
      }
    } catch (fetchError: any) {
      // Ne pas échouer la connexion si l'API SumDown ne répond pas
      console.warn('[sumup-connect] API validation request failed (continuing anyway):', fetchError?.message || 'Network error');
    }

    return NextResponse.json({
      success: true,
      merchantCode: trimmedCode,
      merchantName: merchantName || trimmedCode,
      validated: validationSuccess
    });
  } catch (error: any) {
    console.error('[sumup-connect] Unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Erreur inconnue lors de la connexion SumUp' }, { status: 500 });
  }
}

// GET — Check SumUp connection status
export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cs: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options as any)); },
        },
      }
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const supabase = createAdminClient();
    const { data: profile } = await supabase.from('profiles')
      .select('sumup_api_key, sumup_merchant_code')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      connected: !!(profile?.sumup_api_key && profile?.sumup_merchant_code),
      merchantCode: profile?.sumup_merchant_code || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — Disconnect SumUp
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cs: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options as any)); },
        },
      }
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const supabase = createAdminClient();
    await supabase.from('profiles')
      .update({ sumup_api_key: null, sumup_merchant_code: null })
      .eq('id', user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
