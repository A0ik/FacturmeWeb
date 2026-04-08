'use client';
import { create } from 'zustand';
import { getSupabaseClient } from '@/lib/supabase';

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';
export type MemberStatus = 'pending' | 'active' | 'declined';

export interface Workspace {
  id: string;
  name: string;
  slug: string | null;
  owner_id: string;
  description: string | null;
  logo_url: string | null;
  plan: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string | null;
  email: string;
  role: WorkspaceRole;
  status: MemberStatus;
  display_name: string | null;
  invited_by: string | null;
  joined_at: string | null;
  created_at: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  data: Record<string, unknown>;
  created_at: string;
}

interface WorkspaceState {
  workspace: Workspace | null;
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;

  // Workspace actions
  fetchWorkspace: (userId: string) => Promise<void>;
  createWorkspace: (name: string, description?: string) => Promise<void>;
  updateWorkspace: (data: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: () => Promise<void>;

  // Member actions
  inviteMember: (email: string, role: WorkspaceRole) => Promise<void>;
  createInviteLink: (role: WorkspaceRole) => Promise<string>;
  updateMemberRole: (memberId: string, role: WorkspaceRole) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;

  // Notification actions
  fetchNotifications: (userId: string) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  createNotification: (userId: string, type: string, title: string, body?: string, link?: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspace: null,
  members: [],
  invitations: [],
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchWorkspace: async (userId) => {
    set({ loading: true });
    try {
      const supabase = getSupabaseClient();

      // Try to find owned workspace first
      const { data: ownedWs } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', userId)
        .single();

      const ws = ownedWs ?? null;
      set({ workspace: ws });

      if (ws) {
        // Fetch members
        const { data: members } = await supabase
          .from('workspace_members')
          .select('*')
          .eq('workspace_id', ws.id)
          .order('created_at', { ascending: true });

        // Fetch pending invitations
        const { data: invitations } = await supabase
          .from('workspace_invitations')
          .select('*')
          .eq('workspace_id', ws.id)
          .is('accepted_at', null)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });

        set({
          members: members ?? [],
          invitations: invitations ?? [],
        });
      }
    } finally {
      set({ loading: false });
    }
  },

  createWorkspace: async (name, description) => {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Non authentifié');

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const { data, error } = await supabase
      .from('workspaces')
      .insert({ name, slug, owner_id: session.user.id, description: description ?? null })
      .select()
      .single();

    if (error) throw error;
    set({ workspace: data, members: [], invitations: [] });
  },

  updateWorkspace: async (updates) => {
    const { workspace } = get();
    if (!workspace) return;
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('workspaces')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', workspace.id)
      .select()
      .single();

    if (error) throw error;
    set({ workspace: data });
  },

  deleteWorkspace: async () => {
    const { workspace } = get();
    if (!workspace) return;
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', workspace.id);

    if (error) throw error;
    set({ workspace: null, members: [], invitations: [] });
  },

  inviteMember: async (email, role) => {
    const { workspace } = get();
    if (!workspace) throw new Error('Aucun workspace actif');
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    // Check not already a member
    const existing = get().members.find((m) => m.email.toLowerCase() === email.toLowerCase());
    if (existing) throw new Error('Cet email est déjà membre du workspace');

    // Create invitation record
    const { data: inv, error: invErr } = await supabase
      .from('workspace_invitations')
      .insert({
        workspace_id: workspace.id,
        email,
        role,
        invited_by: session?.user?.id ?? null,
      })
      .select()
      .single();

    if (invErr) throw invErr;

    // Also create a member record (pending)
    const { data: member, error: memErr } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        email,
        role,
        status: 'pending',
        invited_by: session?.user?.id ?? null,
      })
      .select()
      .single();

    if (memErr) throw memErr;

    set((s) => ({
      invitations: [inv, ...s.invitations],
      members: [...s.members, member],
    }));

    // Send invitation email via API
    await fetch('/api/workspace/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        role,
        token: inv.token,
        workspaceName: workspace.name,
      }),
    });
  },

  createInviteLink: async (role) => {
    const { workspace } = get();
    if (!workspace) throw new Error('Aucun workspace actif');
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    const { data: inv, error } = await supabase
      .from('workspace_invitations')
      .insert({
        workspace_id: workspace.id,
        email: '', // open invitation — no specific email required
        role,
        invited_by: session?.user?.id ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    set((s) => ({ invitations: [inv, ...s.invitations] }));
    return inv.token as string;
  },

  updateMemberRole: async (memberId, role) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('workspace_members')
      .update({ role })
      .eq('id', memberId);

    if (error) throw error;
    set((s) => ({
      members: s.members.map((m) => m.id === memberId ? { ...m, role } : m),
    }));
  },

  removeMember: async (memberId) => {
    const supabase = getSupabaseClient();
    const member = get().members.find((m) => m.id === memberId);

    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('id', memberId);

    if (error) throw error;

    // Also remove pending invitation if any
    if (member) {
      await supabase
        .from('workspace_invitations')
        .delete()
        .eq('workspace_id', member.workspace_id)
        .eq('email', member.email)
        .is('accepted_at', null);
    }

    set((s) => ({ members: s.members.filter((m) => m.id !== memberId) }));
  },

  fetchNotifications: async (userId) => {
    const { data } = await getSupabaseClient()
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    const notifs = data ?? [];
    set({
      notifications: notifs,
      unreadCount: notifs.filter((n) => !n.read).length,
    });
  },

  markRead: async (id) => {
    await getSupabaseClient()
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    set((s) => ({
      notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }));
  },

  markAllRead: async () => {
    const { notifications } = get();
    const unread = notifications.filter((n) => !n.read).map((n) => n.id);
    if (!unread.length) return;

    await getSupabaseClient()
      .from('notifications')
      .update({ read: true })
      .in('id', unread);

    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  createNotification: async (userId, type, title, body, link) => {
    const { data } = await getSupabaseClient()
      .from('notifications')
      .insert({ user_id: userId, type, title, body: body ?? null, link: link ?? null })
      .select()
      .single();

    if (data) {
      set((s) => ({
        notifications: [data, ...s.notifications],
        unreadCount: s.unreadCount + 1,
      }));
    }
  },
}));
