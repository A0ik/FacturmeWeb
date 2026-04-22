// POST — sends a push notification to a user
import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase-server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Configure VAPID keys (set these in .env)
const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!;
const VAPID_EMAIL   = process.env.VAPID_EMAIL || 'mailto:admin@facturme.app';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

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

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const { userId, title, body, url } = await req.json();

  // Target user defaults to current session user
  const targetUserId = userId || user.id;

  const supabase = createAdminClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('web_push_subscription')
    .eq('id', targetUserId)
    .single();

  if (!profile?.web_push_subscription) {
    return NextResponse.json({ error: 'Aucun abonnement push pour cet utilisateur' }, { status: 404 });
  }

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return NextResponse.json({ error: 'Clés VAPID non configurées' }, { status: 500 });
  }

  let subscription: webpush.PushSubscription;
  try {
    subscription = JSON.parse(profile.web_push_subscription) as webpush.PushSubscription;
  } catch {
    return NextResponse.json({ error: 'Abonnement push invalide' }, { status: 400 });
  }

  const payload = JSON.stringify({ title, body, url });

  try {
    await webpush.sendNotification(subscription, payload);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    // If subscription expired/invalid, clean it up
    if (err.statusCode === 410 || err.statusCode === 404) {
      await supabase
        .from('profiles')
        .update({ web_push_subscription: null })
        .eq('id', targetUserId);
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
