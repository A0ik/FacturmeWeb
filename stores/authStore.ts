'use client';
import { create } from 'zustand';
import { getSupabaseClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { Profile } from '@/types';
import { changeLanguage } from '@/i18n';

let _authUnsubscribe: (() => void) | null = null;

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ userId: string }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null, profile: null, loading: false, initialized: false,

  initialize: async () => {
    if (_authUnsubscribe) { _authUnsubscribe(); _authUnsubscribe = null; }
    try {
      const { data: { session }, error } = await getSupabaseClient().auth.getSession();
      if (error) { await getSupabaseClient().auth.signOut(); }
      else if (session?.user) { set({ user: session.user }); await get().fetchProfile(session.user.id); }
    } catch (e: any) {
      if (e?.message?.includes('Refresh Token')) await getSupabaseClient().auth.signOut();
    } finally { set({ initialized: true }); }

    const { data: { subscription } } = getSupabaseClient().auth.onAuthStateChange(async (event, session) => {
      if (session?.user) { set({ user: session.user }); await get().fetchProfile(session.user.id); }
      else if (event === 'SIGNED_OUT') set({ user: null, profile: null });
    });
    _authUnsubscribe = () => subscription.unsubscribe();
  },

  signIn: async (email, password) => {
    set({ loading: true });
    try {
      const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) { set({ user: data.user }); await get().fetchProfile(data.user.id); }
    } finally { set({ loading: false }); }
  },

  signUp: async (email, password) => {
    set({ loading: true });
    try {
      const { data, error } = await getSupabaseClient().auth.signUp({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error('Erreur lors de la création du compte');
      set({ user: data.user });
      if (!data.session) throw new Error('CONFIRM_EMAIL');
      // Create initial profile row immediately so onboarding updateProfile works
      const { error: profileError } = await getSupabaseClient().from('profiles').upsert({
        id: data.user.id,
        email: data.user.email ?? email,
        company_name: '',
        language: 'fr',
        onboarding_done: false,
        created_at: new Date().toISOString(),
      }).select().single();
      if (profileError) console.error('[signUp] profile creation warning:', profileError.message);
      return { userId: data.user.id };
    } finally { set({ loading: false }); }
  },

  signInWithGoogle: async () => {
    set({ loading: true });
    try {
      const { error } = await getSupabaseClient().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } finally { set({ loading: false }); }
  },

  signOut: async () => {
    try {
      await getSupabaseClient().auth.signOut();
    } catch {
      // Session may already be invalid — ignore errors
    }
    set({ user: null, profile: null });
    if (typeof window !== 'undefined') {
      localStorage.clear();
      window.location.href = '/login';
    }
  },

  fetchProfile: async (userId) => {
    const { data, error } = await getSupabaseClient().from('profiles').select('*').eq('id', userId).single();
    if (error && error.code !== 'PGRST116') return;
    if (data) {
      set({ profile: data });
      if (data.language) changeLanguage(data.language).catch(() => {});
      registerWebPush(userId).catch(() => {});
    }
  },

  updateProfile: async (updates) => {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    const user = session?.user ?? get().user;
    if (!user) throw new Error('Non authentifié');
    const { data, error } = await getSupabaseClient().from('profiles').upsert({ id: user.id, email: user.email ?? '', ...updates, updated_at: new Date().toISOString() }).select().single();
    if (error) throw error;
    if (data) set({ profile: data });
  },
}));

async function registerWebPush(userId: string): Promise<void> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;
    const reg = await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) });
    await getSupabaseClient().from('profiles').update({ web_push_subscription: JSON.stringify(sub) }).eq('id', userId);
  } catch {}
}

function urlBase64ToUint8Array(b64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out.buffer;
}
