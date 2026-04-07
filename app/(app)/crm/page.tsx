'use client';
import { useEffect, useState } from 'react';
import { useCrmStore, Opportunity, OpportunityInput, OpportunityStage } from '@/stores/crmStore';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { formatCurrency } from '@/lib/utils';
import { Plus, Trash2, GripVertical, TrendingUp } from 'lucide-react';

const STAGES: { key: OpportunityStage; label: string; color: string; bg: string }[] = [
  { key: 'prospect', label: 'Prospect', color: 'text-gray-600', bg: 'bg-gray-100' },
  { key: 'qualified', label: 'Qualifié', color: 'text-blue-600', bg: 'bg-blue-100' },
  { key: 'proposal', label: 'Proposition', color: 'text-purple-600', bg: 'bg-purple-100' },
  { key: 'negotiation', label: 'Négociation', color: 'text-yellow-600', bg: 'bg-yellow-100' },
  { key: 'won', label: 'Gagné', color: 'text-green-600', bg: 'bg-green-100' },
  { key: 'lost', label: 'Perdu', color: 'text-red-600', bg: 'bg-red-100' },
];

const PROB_BY_STAGE: Record<OpportunityStage, number> = {
  prospect: 10, qualified: 25, proposal: 50, negotiation: 75, won: 100, lost: 0,
};

export default function CrmPage() {
  const { opportunities, fetchOpportunities, createOpportunity, updateOpportunity, deleteOpportunity } = useCrmStore();
  const { clients } = useDataStore();
  const { user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [editOpp, setEditOpp] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Partial<OpportunityInput>>({
    client_name: '', title: '', value: 0, stage: 'prospect', probability: 10, notes: '',
  });

  useEffect(() => { if (user) fetchOpportunities(); }, [user]);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => { setEditOpp(null); setForm({ client_name: '', title: '', value: 0, stage: 'prospect', probability: 10, notes: '' }); setShowModal(true); };
  const openEdit = (opp: Opportunity) => { setEditOpp(opp); setForm({ client_name: opp.client_name, title: opp.title, value: opp.value, stage: opp.stage, probability: opp.probability, notes: opp.notes || '' }); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editOpp) await updateOpportunity(editOpp.id, form as Partial<OpportunityInput>);
      else await createOpportunity(form as OpportunityInput);
      setShowModal(false);
    } catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  };

  const handleDrop = async (oppId: string, newStage: OpportunityStage) => {
    await updateOpportunity(oppId, { stage: newStage, probability: PROB_BY_STAGE[newStage] });
  };

  const totalPipeline = opportunities.filter((o) => o.stage !== 'lost').reduce((s, o) => s + o.value * (o.probability / 100), 0);
  const wonRevenue = opportunities.filter((o) => o.stage === 'won').reduce((s, o) => s + o.value, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-gray-900">Pipeline</h1>
        <Button icon={<Plus size={16} />} onClick={openCreate}>Opportunité</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Pipeline pondéré</p>
          <p className="text-xl font-black text-gray-900">{formatCurrency(totalPipeline)}</p>
        </div>
        <div className="bg-primary rounded-2xl p-4">
          <p className="text-xs text-primary-light/80 mb-1">Deals gagnés</p>
          <p className="text-xl font-black text-white">{formatCurrency(wonRevenue)}</p>
        </div>
      </div>

      {/* Kanban board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {STAGES.map((stage) => {
            const stageOpps = opportunities.filter((o) => o.stage === stage.key);
            const stageTotal = stageOpps.reduce((s, o) => s + o.value, 0);

            return (
              <div
                key={stage.key}
                className="w-64 flex-shrink-0"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData('oppId');
                  if (id) handleDrop(id, stage.key);
                }}
              >
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-bold ${stage.color}`}>{stage.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${stage.bg} ${stage.color}`}>{stageOpps.length}</span>
                  </div>
                  <span className="text-xs text-gray-400 font-medium">{formatCurrency(stageTotal)}</span>
                </div>

                <div className="space-y-2 min-h-20">
                  {stageOpps.map((opp) => (
                    <div
                      key={opp.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('oppId', opp.id)}
                      className="bg-white rounded-xl border border-gray-100 p-3 cursor-grab active:cursor-grabbing hover:border-primary/30 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{opp.client_name}</p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{opp.title}</p>
                        </div>
                        <GripVertical size={14} className="text-gray-300 flex-shrink-0 mt-0.5" />
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-sm font-black text-gray-900">{formatCurrency(opp.value)}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${stage.bg} ${stage.color}`}>{opp.probability}%</span>
                      </div>
                      <div className="flex gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(opp)} className="text-xs text-primary font-semibold hover:underline">Modifier</button>
                        <span className="text-gray-200">·</span>
                        <button onClick={() => deleteOpportunity(opp.id)} className="text-xs text-red-400 font-semibold hover:underline">Suppr.</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editOpp ? 'Modifier l\'opportunité' : 'Nouvelle opportunité'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Client" placeholder="Nom du client" value={form.client_name || ''} onChange={(e) => set('client_name', e.target.value)} required />
          <Input label="Titre" placeholder="Ex : Refonte site web" value={form.title || ''} onChange={(e) => set('title', e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valeur (€)" type="number" min="0" value={form.value || 0} onChange={(e) => set('value', parseFloat(e.target.value) || 0)} />
            <Input label="Probabilité (%)" type="number" min="0" max="100" value={form.probability || 0} onChange={(e) => set('probability', parseInt(e.target.value) || 0)} />
          </div>
          <Select
            label="Étape"
            value={form.stage || 'prospect'}
            onChange={(e) => { const s = e.target.value as OpportunityStage; set('stage', s); set('probability', PROB_BY_STAGE[s]); }}
            options={STAGES.map((s) => ({ value: s.key, label: s.label }))}
          />
          <Textarea label="Notes" placeholder="Détails de l'opportunité..." value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} rows={3} />
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button type="submit" className="flex-1" loading={loading}>{editOpp ? 'Enregistrer' : 'Créer'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
