'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore, WorkspaceRole } from '@/stores/workspaceStore';
import { getInitials, cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import {
  Users, Plus, Trash2, Crown, Shield, Eye, UserCheck,
  Mail, Clock, CheckCircle2, XCircle, Settings,
  Building2, Copy, RefreshCw, AlertTriangle, Sparkles,
  ChevronRight, Globe, Lock, Edit3, Check,
} from 'lucide-react';

const ROLE_CONFIG: Record<WorkspaceRole, { label: string; description: string; icon: React.ComponentType<any>; color: string; bg: string }> = {
  owner:  { label: 'Propriétaire', description: 'Contrôle total du workspace',     icon: Crown,     color: 'text-amber-600',  bg: 'bg-amber-50' },
  admin:  { label: 'Administrateur', description: 'Gère membres et paramètres',   icon: Shield,    color: 'text-blue-600',   bg: 'bg-blue-50' },
  member: { label: 'Membre',         description: 'Accès aux factures et clients', icon: UserCheck, color: 'text-green-600',  bg: 'bg-green-50' },
  viewer: { label: 'Lecteur',        description: 'Consultation uniquement',       icon: Eye,       color: 'text-gray-600',   bg: 'bg-gray-100' },
};

const STATUS_CONFIG = {
  active:   { label: 'Actif',     color: 'text-green-600', bg: 'bg-green-50', dot: 'bg-green-500' },
  pending:  { label: 'En attente', color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-400' },
  declined: { label: 'Refusé',    color: 'text-red-600',   bg: 'bg-red-50',   dot: 'bg-red-500' },
};

const GRADIENT_PAIRS = [
  ['#1D9E75', '#0F6E56'], ['#3B82F6', '#1D4ED8'],
  ['#8B5CF6', '#6D28D9'], ['#EF9F27', '#D97706'],
  ['#EF4444', '#DC2626'], ['#EC4899', '#DB2777'],
];

export default function WorkspacePage() {
  const { profile, user } = useAuthStore();
  const {
    workspace, members, invitations, loading,
    fetchWorkspace, createWorkspace, updateWorkspace, deleteWorkspace,
    inviteMember, updateMemberRole, removeMember,
  } = useWorkspaceStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'settings' | 'activity'>('members');

  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' as WorkspaceRole });
  const [settingsForm, setSettingsForm] = useState({ name: '', description: '' });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) fetchWorkspace(user.id);
  }, [user]);

  useEffect(() => {
    if (workspace) setSettingsForm({ name: workspace.name, description: workspace.description ?? '' });
  }, [workspace]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;
    setCreateLoading(true);
    try {
      await createWorkspace(createForm.name.trim(), createForm.description);
      setShowCreateModal(false);
    } catch (err: any) { alert(err.message); }
    finally { setCreateLoading(false); }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(''); setInviteSuccess('');
    if (!inviteForm.email.trim()) return;
    setInviteLoading(true);
    try {
      await inviteMember(inviteForm.email.trim(), inviteForm.role);
      setInviteSuccess(`Invitation envoyée à ${inviteForm.email}`);
      setInviteForm({ email: '', role: 'member' });
    } catch (err: any) { setInviteError(err.message); }
    finally { setInviteLoading(false); }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateWorkspace({ name: settingsForm.name, description: settingsForm.description || null });
      setShowSettingsModal(false);
    } catch (err: any) { alert(err.message); }
  };

  const handleCopyInviteLink = (token: string) => {
    const link = `${window.location.origin}/workspace/join?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isOwner = workspace?.owner_id === user?.id;

  // ── No workspace yet ──────────────────────────────────────
  if (!loading && !workspace) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Workspace</h1>
          <p className="text-sm text-gray-400 mt-0.5">Collaborez en équipe sur vos factures et clients</p>
        </div>

        {/* Hero */}
        <div className="bg-gray-950 rounded-3xl p-8 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-blue-600/10 pointer-events-none" />
          <div className="relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-primary" />
            </div>
            <h2 className="text-2xl font-black mb-2">Travaillez en équipe</h2>
            <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
              Créez un workspace pour inviter votre comptable, associé ou assistant. Définissez qui voit quoi avec les rôles.
            </p>
            <Button
              icon={<Plus size={16} />}
              onClick={() => setShowCreateModal(true)}
              className="bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/20"
            >
              Créer mon workspace
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: Shield, title: 'Rôles granulaires', desc: 'Propriétaire, Admin, Membre ou Lecteur — contrôlez chaque accès', color: 'text-blue-500', bg: 'bg-blue-50' },
            { icon: Mail, title: 'Invitations par email', desc: 'Envoyez une invitation sécurisée, le membre rejoint en un clic', color: 'text-purple-500', bg: 'bg-purple-50' },
            { icon: Globe, title: 'Données partagées', desc: 'Clients et factures accessibles à toute l\'équipe selon les droits', color: 'text-green-600', bg: 'bg-green-50' },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className={`w-9 h-9 rounded-xl ${f.bg} flex items-center justify-center mb-3`}>
                <f.icon size={17} className={f.color} />
              </div>
              <p className="font-bold text-gray-900 text-sm">{f.title}</p>
              <p className="text-xs text-gray-400 mt-1">{f.desc}</p>
            </div>
          ))}
        </div>

        <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Créer un workspace">
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              label="Nom du workspace *"
              placeholder="Ex : Agence Dupont, Cabinet Martin..."
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <Textarea
              label="Description (optionnel)"
              placeholder="Décrivez l'usage du workspace..."
              value={createForm.description}
              onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
            />
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowCreateModal(false)}>Annuler</Button>
              <Button type="submit" className="flex-1" loading={createLoading}>Créer le workspace</Button>
            </div>
          </form>
        </Modal>
      </div>
    );
  }

  // ── Workspace exists ──────────────────────────────────────
  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gray-950 flex items-center justify-center text-white font-black text-lg shadow-md">
            {(workspace?.name ?? 'W').charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">{workspace?.name}</h1>
            {workspace?.description && (
              <p className="text-sm text-gray-400 mt-0.5">{workspace.description}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-400">{members.length + 1} membre{members.length !== 0 ? 's' : ''}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span className="text-xs text-primary font-semibold capitalize">{workspace?.plan ?? 'free'}</span>
            </div>
          </div>
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-1.5 border border-gray-200 px-3 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-all"
            >
              <Settings size={14} /> Paramètres
            </button>
            <Button icon={<Plus size={16} />} onClick={() => setShowInviteModal(true)}>
              Inviter
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['members', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize',
              activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {tab === 'members' ? `Membres (${members.length + 1})` : 'Paramètres'}
          </button>
        ))}
      </div>

      {/* ── MEMBERS TAB ── */}
      {activeTab === 'members' && (
        <div className="space-y-3">
          {/* Owner row */}
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-gray-50/60">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Propriétaire</p>
            </div>
            <div className="flex items-center gap-4 px-5 py-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #1D9E75, #0F6E56)' }}
              >
                {getInitials(profile?.company_name || profile?.first_name || 'O')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">
                  {profile?.company_name || profile?.first_name || 'Mon compte'}
                </p>
                <p className="text-xs text-gray-400 truncate">{profile?.email}</p>
              </div>
              <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold', ROLE_CONFIG.owner.bg, ROLE_CONFIG.owner.color)}>
                <Crown size={11} />
                Propriétaire
              </div>
            </div>
          </div>

          {/* Members list */}
          {members.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-gray-50/60 border-b border-gray-50">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Membres invités ({members.length})
                </p>
              </div>
              <div className="divide-y divide-gray-50">
                {members.map((member, idx) => {
                  const roleConf = ROLE_CONFIG[member.role];
                  const statusConf = STATUS_CONFIG[member.status];
                  const [from, to] = GRADIENT_PAIRS[idx % GRADIENT_PAIRS.length];
                  const RoleIcon = roleConf.icon;

                  return (
                    <div key={member.id} className="flex items-center gap-4 px-5 py-4 group hover:bg-gray-50/50 transition-colors">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                      >
                        {member.display_name
                          ? getInitials(member.display_name)
                          : member.email.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">
                          {member.display_name || member.email}
                        </p>
                        {member.display_name && (
                          <p className="text-xs text-gray-400 truncate">{member.email}</p>
                        )}
                      </div>

                      {/* Status badge */}
                      <div className={cn('hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold', statusConf.bg, statusConf.color)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', statusConf.dot)} />
                        {statusConf.label}
                      </div>

                      {/* Role selector */}
                      {isOwner ? (
                        <select
                          value={member.role}
                          onChange={(e) => updateMemberRole(member.id, e.target.value as WorkspaceRole)}
                          className={cn(
                            'text-xs font-semibold px-2.5 py-1.5 rounded-lg border-0 cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30',
                            roleConf.bg, roleConf.color,
                          )}
                        >
                          {Object.entries(ROLE_CONFIG).filter(([r]) => r !== 'owner').map(([r, conf]) => (
                            <option key={r} value={r}>{conf.label}</option>
                          ))}
                        </select>
                      ) : (
                        <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold', roleConf.bg, roleConf.color)}>
                          <RoleIcon size={11} />
                          {roleConf.label}
                        </div>
                      )}

                      {/* Remove */}
                      {isOwner && (
                        <button
                          onClick={() => {
                            if (confirm(`Retirer ${member.email} du workspace ?`)) removeMember(member.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all flex-shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pending invitations */}
          {invitations.length > 0 && (
            <div className="bg-amber-50 rounded-2xl border border-amber-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-amber-100">
                <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
                  Invitations en attente ({invitations.length})
                </p>
              </div>
              <div className="divide-y divide-amber-100">
                {invitations.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-3 px-5 py-3">
                    <Clock size={15} className="text-amber-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-amber-800 truncate">{inv.email}</p>
                      <p className="text-xs text-amber-600">
                        Expire le {new Date(inv.expires_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded-lg capitalize">
                        {ROLE_CONFIG[inv.role as WorkspaceRole]?.label ?? inv.role}
                      </span>
                      <button
                        onClick={() => handleCopyInviteLink(inv.token)}
                        className="p-1.5 rounded-lg hover:bg-amber-200 text-amber-600 transition-colors"
                        title="Copier le lien d'invitation"
                      >
                        {copied ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {members.length === 0 && invitations.length === 0 && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
              <Users size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="font-bold text-gray-400 text-sm">Aucun membre pour l'instant</p>
              <p className="text-xs text-gray-300 mt-1 mb-4">Invitez votre équipe pour collaborer</p>
              {isOwner && (
                <Button icon={<Plus size={14} />} onClick={() => setShowInviteModal(true)}>
                  Inviter un membre
                </Button>
              )}
            </div>
          )}

          {/* Role legend */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Guide des rôles</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ROLE_CONFIG).map(([role, conf]) => {
                const Icon = conf.icon;
                return (
                  <div key={role} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50">
                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', conf.bg)}>
                      <Icon size={13} className={conf.color} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-700">{conf.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{conf.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── SETTINGS TAB ── */}
      {activeTab === 'settings' && isOwner && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900">Informations du workspace</h3>
            <form onSubmit={handleSaveSettings} className="space-y-3">
              <Input
                label="Nom du workspace"
                value={settingsForm.name}
                onChange={(e) => setSettingsForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
              <Textarea
                label="Description"
                value={settingsForm.description}
                onChange={(e) => setSettingsForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Décrivez l'usage de ce workspace..."
              />
              <Button type="submit" size="sm">Enregistrer</Button>
            </form>
          </div>

          {/* Permissions overview */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">Permissions par rôle</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 pr-4 text-gray-500 font-semibold">Action</th>
                    {Object.entries(ROLE_CONFIG).map(([r, conf]) => (
                      <th key={r} className={cn('text-center py-2 px-3 font-semibold', conf.color)}>{conf.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    { action: 'Voir les factures', perms: [true, true, true, true] },
                    { action: 'Créer des factures', perms: [true, true, true, false] },
                    { action: 'Modifier les factures', perms: [true, true, true, false] },
                    { action: 'Supprimer les factures', perms: [true, true, false, false] },
                    { action: 'Gérer les clients', perms: [true, true, true, false] },
                    { action: 'Inviter des membres', perms: [true, true, false, false] },
                    { action: 'Modifier les paramètres', perms: [true, false, false, false] },
                    { action: 'Supprimer le workspace', perms: [true, false, false, false] },
                  ].map((row) => (
                    <tr key={row.action} className="hover:bg-gray-50">
                      <td className="py-2 pr-4 text-gray-600 font-medium">{row.action}</td>
                      {row.perms.map((perm, i) => (
                        <td key={i} className="text-center py-2 px-3">
                          {perm
                            ? <CheckCircle2 size={14} className="text-green-500 mx-auto" />
                            : <XCircle size={14} className="text-gray-200 mx-auto" />}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Danger zone */}
          <div className="bg-red-50 rounded-2xl border border-red-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-red-500" />
              <h3 className="font-bold text-red-700">Zone de danger</h3>
            </div>
            <p className="text-sm text-red-600 mb-4">
              La suppression du workspace est irréversible. Tous les membres perdront l'accès immédiatement.
            </p>
            <button
              onClick={() => {
                if (confirm('Supprimer définitivement ce workspace ? Tous les accès seront révoqués.')) {
                  deleteWorkspace();
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors"
            >
              <Trash2 size={14} />
              Supprimer le workspace
            </button>
          </div>
        </div>
      )}

      {/* ── INVITE MODAL ── */}
      <Modal open={showInviteModal} onClose={() => { setShowInviteModal(false); setInviteError(''); setInviteSuccess(''); }} title="Inviter un membre">
        <div className="space-y-4">
          <form onSubmit={handleInvite} className="space-y-3">
            <Input
              label="Adresse email *"
              type="email"
              placeholder="collaborateur@exemple.com"
              value={inviteForm.email}
              onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
              required
            />

            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Rôle</label>
              <div className="grid grid-cols-2 gap-2">
                {(['admin', 'member', 'viewer'] as WorkspaceRole[]).map((role) => {
                  const conf = ROLE_CONFIG[role];
                  const Icon = conf.icon;
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setInviteForm((f) => ({ ...f, role }))}
                      className={cn(
                        'flex items-start gap-2.5 p-3 rounded-xl border-2 text-left transition-all',
                        inviteForm.role === role
                          ? 'border-primary bg-primary-light'
                          : 'border-gray-100 hover:border-gray-200',
                      )}
                    >
                      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', conf.bg)}>
                        <Icon size={13} className={conf.color} />
                      </div>
                      <div>
                        <p className={cn('text-xs font-bold', inviteForm.role === role ? 'text-primary' : 'text-gray-700')}>{conf.label}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{conf.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {inviteError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                <XCircle size={14} className="text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600">{inviteError}</p>
              </div>
            )}

            {inviteSuccess && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
                <p className="text-sm text-green-600">{inviteSuccess}</p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowInviteModal(false)}>
                Annuler
              </Button>
              <Button type="submit" className="flex-1" loading={inviteLoading} icon={<Mail size={14} />}>
                Envoyer l'invitation
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
