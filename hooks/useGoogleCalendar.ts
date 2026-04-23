'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

export interface GoogleInfo {
  email: string;
  name: string;
  picture: string;
  connectedAt: string;
}

export interface GoogleCalendarState {
  connected: boolean;
  loading: boolean;
  googleInfo: GoogleInfo | null;
  hasRefreshToken: boolean;
}

export function useGoogleCalendar() {
  const [state, setState] = useState<GoogleCalendarState>({
    connected: false,
    loading: true,
    googleInfo: null,
    hasRefreshToken: false,
  });

  const searchParams = useSearchParams();
  const router = useRouter();

  // Fetch connection status on mount
  useEffect(() => {
    checkConnection();

    // Check for OAuth callback parameters
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'google_connected') {
      toast.success('Google Calendar connecté avec succès!');
      // Clean URL params
      router.replace('/calendar');
      // Refresh connection status
      setTimeout(() => checkConnection(), 500);
    } else if (error) {
      toast.error('Erreur de connexion à Google Calendar');
      router.replace('/calendar');
    }
  }, []);

  const checkConnection = async () => {
    try {
      const res = await fetch('/api/google/sync');
      if (!res.ok) throw new Error('Failed to check connection');

      const data = await res.json();
      setState({
        connected: data.connected || false,
        loading: false,
        googleInfo: data.connected ? {
          email: data.email || '',
          name: data.name || '',
          picture: data.picture || '',
          connectedAt: data.connectedAt || '',
        } : null,
        hasRefreshToken: data.hasRefreshToken || false,
      });
    } catch (error) {
      console.error('Error checking Google connection:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const connect = async () => {
    try {
      const res = await fetch('/api/google/oauth');
      if (!res.ok) throw new Error('Failed to initiate OAuth');

      const data = await res.json();
      // Redirect to Google OAuth
      window.location.href = data.url;
    } catch (error) {
      console.error('Error initiating Google OAuth:', error);
      toast.error('Impossible de se connecter à Google Calendar');
    }
  };

  const disconnect = async () => {
    try {
      const res = await fetch('/api/google/disconnect', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to disconnect');

      setState({
        connected: false,
        loading: false,
        googleInfo: null,
        hasRefreshToken: false,
      });
      toast.success('Google Calendar déconnecté');
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      toast.error('Erreur lors de la déconnexion');
    }
  };

  const syncAppointment = async (appointmentId: string): Promise<{ success: boolean; eventId?: string; error?: string }> => {
    try {
      const res = await fetch('/api/google/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        return { success: false, error: errorData.error || 'Sync failed' };
      }

      const data = await res.json();
      toast.success('Synchronisé avec Google Calendar');
      return { success: true, eventId: data.eventId };
    } catch (error) {
      console.error('Error syncing appointment:', error);
      toast.error('Erreur lors de la synchronisation');
      return { success: false, error: 'Sync failed' };
    }
  };

  return {
    ...state,
    connect,
    disconnect,
    syncAppointment,
    refreshConnection: checkConnection,
  };
}
