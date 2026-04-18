import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy initialization to avoid build-time execution
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const { name, user_id, description } = await req.json();

    if (!name || !user_id) {
      return NextResponse.json({ error: 'Name and user_id are required' }, { status: 400 });
    }

    // Check user's subscription tier and existing workspace count
    const { data: profile } = await getSupabaseAdmin()
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user_id)
      .single();

    const tier = profile?.subscription_tier || 'free';

    // Count existing workspaces owned by this user
    const { count: workspaceCount } = await getSupabaseAdmin()
      .from('workspaces')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user_id);

    // Enforce workspace limits
    if (tier !== 'pro' && workspaceCount !== null && workspaceCount >= 1) {
      return NextResponse.json({
        error: 'Limitation de plan',
        message: 'La création de plusieurs dossiers nécessite un abonnement Pro. Passez à Pro pour créer plusieurs dossiers d\'entreprise.',
        tier,
        currentWorkspaces: workspaceCount,
        limit: tier === 'pro' ? Infinity : 1
      }, { status: 403 });
    }

    // Create slug from name
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if slug already exists
    const { data: existing } = await getSupabaseAdmin()
      .from('workspaces')
      .select('id')
      .eq('slug', slug)
      .single();

    const finalSlug = existing
      ? `${slug}-${Date.now().toString(36)}`
      : slug;

    // Create workspace
    const { data: workspace, error } = await getSupabaseAdmin()
      .from('workspaces')
      .insert({
        name,
        slug: finalSlug,
        owner_id: user_id,
        description: description || null,
        plan: 'free',
        settings: {},
      })
      .select()
      .single();

    if (error) throw error;

    // Add owner as admin member
    await getSupabaseAdmin()
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id,
        email: '', // Will be filled from profile if needed
        role: 'admin',
        status: 'active',
      });

    return NextResponse.json({ workspace });
  } catch (err: any) {
    console.error('Create Workspace Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const { data: workspaces, error } = await getSupabaseAdmin()
      .from('workspaces')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ workspaces });
  } catch (err: any) {
    console.error('List Workspaces Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
