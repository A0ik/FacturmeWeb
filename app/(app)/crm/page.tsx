'use client';
import { useEffect, useState } from 'react';
import { useCrmStore, Opportunity, OpportunityInput, OpportunityStage } from '@/stores/crmStore';
import { useDataStore } from '@/stores/dataStore';
import { useAuthStore } from '@/stores/authStore';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { formatCurrency } from '@/lib/utils';
import {
  Plus, Trash2, GripVertical, TrendingUp, Target,
  Trophy, Users, ChevronRight, Sparkles, ArrowUpRight,
  Percent, BarChart3, Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STAGES: {
  key: OpportunityStage;
  label: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
  barColor: string;
}[] = [
  { key: 'prospect',    label: 'Prospect',     emoji: '👁️',  color: 'text-gray-600',   bg: 'bg-gray-100',   border: 'border-gray-200',  barColor: 'bg-gray-400' },
  { key: 'qualified',   label: 'Qualifié',     emoji: '✅',  color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-100',  barColor: 'bg-blue-500' },
  { key: 'proposal',    label: 'Proposition',  emoji: '📄',  color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', barColor: 'bg-purple-500' },
  { key: 'negotiation', label: 'Négociation',  emoji: '🤝',  color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-100', barColor: 'bg-yellow-500' },
  { key: 'won',         label: 'Gagné',        emoji: '🏆',  color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-100',  barColor: 'bg-green-500' },
  { key: 'lost',        label: 'Perdu',        emoji: '❌',  color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-100',    barColor: 'bg-red-400' },
];

const PROB_BY_STAGE: Record<OpportunityStage, number> = {
  prospect: 10, qualified: 25, proposal: 50, negotiation: 75, won: 100, lost: 0,
};

function ProbabilityBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-[10px] font-bold text-gray-500 tabular-nums w-7 text-right">{value}%</span>
    </div>
  );
}

export default function CrmPage() {
  const { opportunities, fetchOpportunities, createOpportunity, updateOpportunity, deleteOpportunity } = useCrmStore();
  const { clients } = useDataStore();
  const { user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const [editOpp, setEditOpp] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragOverStage, setDragOverStage] = useState<OpportunityStage | null>(null);
  const [form, setForm] = useState<Partial<OpportunityInput>>({
    client_name: '', title: '', value: 0, stage: 'prospect', probability: 10, notes: '',
  });

  useEffect(() => { if (user) fetchOpportunities(); }, [user]);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => {
    setEditOpp(null);
    setForm({ client_name: '', title: '', value: 0, stage: 'prospect', probability: 10, notes: '' });
    setShowModal(true);
  };
  const openEdit = (opp: Opportunity) => {
    setEditOpp(opp);
    setForm({ client_name: opp.client_name, title: opp.title, value: opp.value, stage: opp.stage, probability: opp.probability, notes: opp.notes || '' });
    setShowModal(true);
  };

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
    setDragOverStage(null);
    await updateOpportunity(oppId, { stage: newStage, probability: PROB_BY_STAGE[newStage] });
  };

  const handleQuickWin = async (e: React.MouseEvent, opp: Opportunity) => {
    e.stopPropagation();
    await updateOpportunity(opp.id, { stage: 'won', probability: 100 });
  };

  // Stats
  const totalPipeline = opportunities
    .filter((o) => o.stage !== 'lost')
    .reduce((s, o) => s + o.value * (o.probability / 100), 0);
  const wonRevenue = opportunities.filter((o) => o.stage === 'won').reduce((s, o) => s + o.value, 0);
  const totalDeals = opportunities.filter((o) => o.stage !== 'lost').length;
  const wonDeals = opportunities.filter((o) => o.stage === 'won').length;
  const winRate = totalDeals > 0 ? Math.round((wonDeals / (wonDeals + opportunities.filter((o) => o.stage === 'lost').length || 1)) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Pipeline</h1>
          <p className="text-sm text-gray-400 mt-0.5">{opportunities.length} opportunité{opportunities.length !== 1 ? 's' : ''} au total</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={openCreate}>
          Opportunité
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gray-900 text-white rounded-2xl border border-gray-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Pipeline pondéré</span>
            <BarChart3 size={14} className="text-gray-500" />
          </div>
          <p className="text-xl font-black">{formatCurrency(totalPipeline)}</p>
          <p className="text-[11px] text-gray-500 mt-1">{totalDeals} deals actifs</p>
        </div>

        <div className="bg-primary text-white rounded-2xl border border-primary-dark p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-primary-light/70 uppercase tracking-wider">Deals gagnés</span>
            <Trophy size={14} className="text-primary-light/70" />
          </div>
          <p className="text-xl font-black">{formatCurrency(wonRevenue)}</p>
          <p className="text-[11px] text-primary-light/60 mt-1">{wonDeals} deal{wonDeals !== 1 ? 's' : ''} closé{wonDeals !== 1 ? 's' : ''}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Taux de conversion</span>
            <Percent size={14} className="text-gray-300" />
          </div>
          <p className="text-xl font-black text-gray-900">{winRate}%</p>
          <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${winRate}%` }} />
          </div>
        </div>

        <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">En négociation</span>
            <Flame size={14} className="text-amber-500" />
          </div>
          <p className="text-xl font-black text-amber-800">
            {formatCurrency(opportunities.filter((o) => o.stage === 'negotiation').reduce((s, o) => s + o.value, 0))}
          </p>
          <p className="text-[11px] text-amber-600 mt-1">
            {opportunities.filter((o) => o.stage === 'negotiation').length} opportunité{opportunities.filter((o) => o.stage === 'negotiation').length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Kanban */}
      {opportunities.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-16 px-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-4">
            <Target size={28} className="text-gray-200" />
          </div>
          <p className="font-bold text-gray-400 text-sm">Aucune opportunité pour l'instant</p>
          <p className="text-xs text-gray-300 mt-1 mb-4">Ajoutez vos prospects et suivez leur avancement</p>
          <Button icon={<Plus size={14} />} onClick={openCreate}>
            Créer une opportunité
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4 -mx-4 px-4">
          <div className="flex gap-3 min-w-max">
            {STAGES.map((stage) => {
              const stageOpps = opportunities.filter((o) => o.stage === stage.key);
              const stageTotal = stageOpps.reduce((s, o) => s + o.value, 0);
              const isDragOver = dragOverStage === stage.key;

              return (
                <div
                  key={stage.key}
                  className="w-64 flex-shrink-0"
                  onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.key); }}
                  onDragLeave={() => setDragOverStage(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData('oppId');
                    if (id) handleDrop(id, stage.key);
                  }}
                >
                  {/* Column header */}
                  <div className={cn(
                    'flex items-center justify-between mb-2.5 px-3 py-2 rounded-xl border transition-colors',
                    stage.bg, stage.border,
                  )}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{stage.emoji}</span>
                      <span className={cn('text-xs font-bold', stage.color)}>{stage.label}</span>
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-bold', stage.bg, stage.color, 'border', stage.border)}>
                        {stageOpps.length}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 font-semibold tabular-nums">
                      {formatCurrency(stageTotal)}
                    </span>
                  </div>

                  {/* Drop zone */}
                  <div className={cn(
                    'space-y-2 min-h-24 rounded-2xl transition-all duration-200 p-1',
                    isDragOver && 'bg-primary/5 ring-2 ring-primary/20 ring-dashed',
                  )}>
                    {stageOpps.map((opp) => {
                      const stageConfig = STAGES.find((s) => s.key === opp.stage)!;
                      return (
                        <div
                          key={opp.id}
                          draggable
                          onDragStart={(e) => { e.dataTransfer.setData('oppId', opp.id); }}
                          className="bg-white rounded-xl border border-gray-100 p-3 cursor-grab active:cursor-grabbing hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
                        >
                          {/* Card header */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate">{opp.client_name}</p>
                              <p className="text-xs text-gray-500 truncate mt-0.5">{opp.title}</p>
                            </div>
                            <GripVertical size={13} className="text-gray-200 flex-shrink-0 mt-0.5 group-hover:text-gray-400" />
                          </div>

                          {/* Amount */}
                          <p className="text-base font-black text-gray-900 tabular-nums">
                            {formatCurrency(opp.value)}
                          </p>

                          {/* Probability bar */}
                          <ProbabilityBar value={opp.probability} color={stageConfig.barColor} />

                          {/* Actions */}
                          <div className="flex gap-2 mt-2.5 pt-2.5 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEdit(opp)}
                              className="flex-1 text-[11px] text-gray-500 font-semibold hover:text-primary transition-colors text-center"
                            >
                              Modifier
                            </button>
                            {opp.stage !== 'won' && opp.stage !== 'lost' && (
                              <button
                                onClick={(e) => handleQuickWin(e, opp)}
                                className="flex-1 text-[11px] text-green-600 font-semibold hover:text-green-700 transition-colors text-center"
                              >
                                ✓ Gagné
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteOpportunity(opp.id); }}
                              className="text-[11px] text-red-400 font-semibold hover:text-red-600 transition-colors"
                            >
                              Suppr.
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Empty column hint */}
                    {stageOpps.length === 0 && (
                      <div className="flex items-center justify-center h-16 rounded-xl border border-dashed border-gray-150 text-gray-200 text-xs font-medium">
                        Glisser ici
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editOpp ? 'Modifier l\'opportunité' : 'Nouvelle opportunité'}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            label="Client"
            placeholder="Nom du client ou de l'entreprise"
            value={form.client_name || ''}
            onChange={(e) => set('client_name', e.target.value)}
            required
          />
          <Input
            label="Titre du deal"
            placeholder="Ex : Refonte site web, Audit SEO..."
            value={form.title || ''}
            onChange={(e) => set('title', e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Valeur estimée (€)"
              type="number"
              min="0"
              step="100"
              value={form.value || 0}
              onChange={(e) => set('value', parseFloat(e.target.value) || 0)}
            />
            <Input
              label="Probabilité (%)"
              type="number"
              min="0"
              max="100"
              value={form.probability || 0}
              onChange={(e) => set('probability', parseInt(e.target.value) || 0)}
            />
          </div>

          {/* Probability preview bar */}
          <div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${form.probability || 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Valeur attendue : <strong className="text-gray-700">{formatCurrency((form.value || 0) * ((form.probability || 0) / 100))}</strong>
            </p>
          </div>

          <Select
            label="Étape"
            value={form.stage || 'prospect'}
            onChange={(e) => {
              const s = e.target.value as OpportunityStage;
              set('stage', s);
              set('probability', PROB_BY_STAGE[s]);
            }}
            options={STAGES.map((s) => ({ value: s.key, label: `${s.emoji} ${s.label}` }))}
          />
          <Textarea
            label="Notes"
            placeholder="Contexte, prochaines étapes, contacts..."
            value={form.notes || ''}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
          />
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>
              Annuler
            </Button>
            <Button type="submit" className="flex-1" loading={loading}>
              {editOpp ? 'Enregistrer' : 'Créer le deal'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
