'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import Link from 'next/link';
import { CheckCircle2, XCircle, Clock, Users, Loader2 } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

type State = 'loading' | 'valid' | 'accepted' | 'expired' | 'already' | 'error';

export default function JoinWorkspacePage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token');
  const [state, setState] = useState<State>('loading');
  const [workspaceName, setWorkspaceName] = useState('');
  const [inviterEmail, setInviterEmail] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => {
    if (!token) { setState('error'); return; }
    checkToken();
  }, [token]);

  const checkToken = async () => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('workspace_invitations')
      .select('*, workspaces(name)')
      .eq('token', token!)
      .single();

    if (error || !data) { setState('error'); return; }
    if (data.accepted_at) { setState('already'); return; }
    if (new Date(data.expires_at) < new Date()) { setState('expired'); return; }

    setWorkspaceName((data as any).workspaces?.name ?? 'Workspace');
    setRole(data.role);
    setState('valid');
  };

  const handleAccept = async () => {
    setState('loading');
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push(`/login?redirect=/workspace/join?token=${token}`);
      return;
    }

    // Mark invitation as accepted
    await supabase
      .from('workspace_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('token', token!);

    // Update member record
    const { data: inv } = await supabase
      .from('workspace_invitations')
      .select('workspace_id, email')
      .eq('token', token!)
      .single();

    if (inv) {
      await supabase
        .from('workspace_members')
        .update({
          user_id: session.user.id,
          status: 'active',
          joined_at: new Date().toISOString(),
        })
        .eq('workspace_id', inv.workspace_id)
        .eq('email', inv.email);
    }

    setState('accepted');
    setTimeout(() => router.push('/dashboard'), 2000);
  };

  const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrateur', member: 'Membre', viewer: 'Lecteur',
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo size="md" variant="full" />
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
          {state === 'loading' && (
            <div className="p-10 text-center">
              <Loader2 size={32} className="text-primary mx-auto mb-4 animate-spin" />
              <p className="text-gray-500 font-medium">Vérification de l'invitation...</p>
            </div>
          )}

          {state === 'valid' && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center mx-auto mb-4">
                <Users size={28} className="text-primary" />
              </div>
              <h1 className="text-xl font-black text-gray-900 mb-2">Rejoindre {workspaceName}</h1>
              <p className="text-sm text-gray-500 mb-1">
                Vous avez été invité en tant que <strong className="text-gray-800">{ROLE_LABELS[role] ?? role}</strong>.
              </p>
              <p className="text-xs text-gray-400 mb-6">
                En acceptant, vous aurez accès aux ressources partagées du workspace.
              </p>
              <button
                onClick={handleAccept}
                className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-colors"
              >
                Accepter l'invitation
              </button>
              <Link href="/dashboard" className="block mt-3 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                Refuser
              </Link>
            </div>
          )}

          {state === 'accepted' && (
            <div className="p-8 text-center">
              <CheckCircle2 size={48} className="text-primary mx-auto mb-4" />
              <h1 className="text-xl font-black text-gray-900 mb-2">Bienvenue dans {workspaceName} !</h1>
              <p className="text-sm text-gray-500">Redirection vers le dashboard...</p>
            </div>
          )}

          {(state === 'expired' || state === 'error') && (
            <div className="p-8 text-center">
              <Clock size={48} className="text-amber-400 mx-auto mb-4" />
              <h1 className="text-xl font-black text-gray-900 mb-2">Invitation expirée</h1>
              <p className="text-sm text-gray-500 mb-6">Ce lien n'est plus valide. Demandez une nouvelle invitation.</p>
              <Link href="/login" className="block w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-center hover:bg-gray-800 transition-colors">
                Retour à l'accueil
              </Link>
            </div>
          )}

          {state === 'already' && (
            <div className="p-8 text-center">
              <CheckCircle2 size={48} className="text-primary mx-auto mb-4" />
              <h1 className="text-xl font-black text-gray-900 mb-2">Déjà membre</h1>
              <p className="text-sm text-gray-500 mb-6">Vous avez déjà accepté cette invitation.</p>
              <Link href="/dashboard" className="block w-full py-3 bg-primary text-white rounded-xl font-bold text-center hover:bg-primary-dark transition-colors">
                Aller au dashboard
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
