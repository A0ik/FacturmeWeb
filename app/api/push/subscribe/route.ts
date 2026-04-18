// POST — saves user's push subscription to profile
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cs: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options as any));
        },
      },
    }
  );

  const { data: { session } } = await supabaseAuth.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const subscription = await req.json();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('profiles')
    .update({ web_push_subscription: JSON.stringify(subscription) })
    .eq('id', session.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
