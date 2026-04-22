import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Refresh access token if needed
async function refreshAccessToken(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('google_refresh_token')
    .eq('id', userId)
    .single();

  if (!profile?.google_refresh_token) {
    throw new Error('No refresh token available');
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Google OAuth credentials');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: profile.google_refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  const tokens = await response.json();

  // Update access token and expiry
  await supabase
    .from('profiles')
    .update({
      google_access_token: tokens.access_token,
      google_token_expires_at: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
    })
    .eq('id', userId);

  return tokens.access_token;
}

// Check if token is expired and refresh if needed
async function getValidAccessToken(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('google_access_token, google_token_expires_at, google_refresh_token')
    .eq('id', userId)
    .single();

  if (!profile?.google_access_token) {
    throw new Error('No access token available');
  }

  const expiresAt = profile.google_token_expires_at
    ? new Date(profile.google_token_expires_at)
    : null;

  // If token expires in less than 5 minutes, refresh it
  if (expiresAt && expiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
    return await refreshAccessToken(supabase, userId);
  }

  return profile.google_access_token;
}

// POST - Sync appointment to Google Calendar
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { appointmentId } = await req.json();
    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId requis' }, { status: 400 });
    }

    // Get appointment details
    const { data: appointment } = await supabase
      .from('appointments')
      .select('*, client:clients(*)')
      .eq('id', appointmentId)
      .single();

    if (!appointment) {
      return NextResponse.json({ error: 'Rendez-vous introuvable' }, { status: 404 });
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(supabase, user.id);

    // Check if event already exists in Google Calendar
    if (appointment.google_event_id) {
      // Update existing event
      const startDate = `${appointment.appointment_date}T${appointment.start_time}:00`;
      const endDate = `${appointment.appointment_date}T${appointment.end_time}:00`;

      const eventBody = {
        summary: appointment.title,
        description: appointment.description || '',
        location: appointment.location || '',
        start: { dateTime: startDate },
        end: { dateTime: endDate },
      };

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${appointment.google_event_id}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventBody),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('[google-sync] Update failed:', error);
        return NextResponse.json({ error: 'Erreur lors de la mise à jour Google Calendar' }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: 'updated' });
    }

    // Create new event
    const startDate = `${appointment.appointment_date}T${appointment.start_time}:00`;
    const endDate = `${appointment.appointment_date}T${appointment.end_time}:00`;

    const eventBody: any = {
      summary: appointment.title,
      description: appointment.description || '',
      location: appointment.location || '',
      start: { dateTime: startDate },
      end: { dateTime: endDate },
      reminders: {
        useDefault: true,
      },
    };

    // Add attendees if client has email
    if (appointment.client?.email) {
      eventBody.attendees = [{ email: appointment.client.email }];
    }

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[google-sync] Create failed:', error);
      return NextResponse.json({ error: 'Erreur lors de la création sur Google Calendar' }, { status: 500 });
    }

    const event = await response.json();

    // Save Google event ID
    await supabase
      .from('appointments')
      .update({ google_event_id: event.id })
      .eq('id', appointmentId);

    return NextResponse.json({ success: true, action: 'created', eventId: event.id });
  } catch (error: any) {
    console.error('[google-sync] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Check Google Calendar connection status
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ connected: false }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('google_access_token, google_email, google_name, google_picture, google_connected_at')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      connected: !!profile?.google_access_token,
      email: profile?.google_email || null,
      name: profile?.google_name || null,
      picture: profile?.google_picture || null,
      connectedAt: profile?.google_connected_at || null,
    });
  } catch (error: any) {
    console.error('[google-sync] Status check error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
