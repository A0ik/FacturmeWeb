import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createContractVersion } from '@/lib/labor-law/contract-version-service';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { contractId, contractType, contractData, comment } = await req.json();

    if (!contractId || !contractType || !contractData) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    // Vérifier que l'utilisateur a le droit d'accéder à ce contrat
    const { data: contract, error: accessError } = await supabase
      .from(`contracts_${contractType}`)
      .select('user_id')
      .eq('id', contractId)
      .single();

    if (accessError || !contract) {
      return NextResponse.json({ error: 'Contrat non trouvé' }, { status: 404 });
    }

    if (contract.user_id !== user.id) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    // Créer la version
    const version = await createContractVersion(
      contractId,
      contractType as 'cdi' | 'cdd' | 'other',
      contractData,
      user.id,
      comment
    );

    return NextResponse.json({ success: true, version });
  } catch (error: any) {
    console.error('[Contract Version] Error:', error);
    return NextResponse.json({ error: error.message || 'Erreur lors de la création de la version' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const contractId = searchParams.get('contractId');
    const contractType = searchParams.get('contractType');

    if (!contractId || !contractType) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    // Vérifier l'accès
    const { data: contract, error: accessError } = await supabase
      .from(`contracts_${contractType}`)
      .select('user_id')
      .eq('id', contractId)
      .single();

    if (accessError || !contract) {
      return NextResponse.json({ error: 'Contrat non trouvé' }, { status: 404 });
    }

    if (contract.user_id !== user.id) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    // Récupérer les versions
    const { data: versions, error } = await supabase
      .from('contract_versions')
      .select('*')
      .eq('contract_id', contractId)
      .eq('contract_type', contractType)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ versions: versions || [] });
  } catch (error: any) {
    console.error('[Contract Version] Error:', error);
    return NextResponse.json({ error: error.message || 'Erreur lors de la récupération des versions' }, { status: 500 });
  }
}
