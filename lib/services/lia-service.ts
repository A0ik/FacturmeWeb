/**
 * Service Lia - AI Assistant pour contrats et bulletins de paie
 * Utilise glm 4.5 via OpenRouter pour:
 * - Modification de bulletins de paie
 * - Vérification de conformité des contrats
 * - Optimisé pour 1000+ utilisateurs
 */

import OpenAI from 'openai';

interface LiaConfig {
  apiKey?: string;
  model?: string;
}

interface ContractConformityRequest {
  contractType: string;
  contractData: any;
  contractContent?: string;
}

interface ContractConformityResponse {
  isConform: boolean;
  missingMentions: string[];
  recommendations: string[];
  legalReferences: string[];
  riskLevel: 'low' | 'medium' | 'high';
  summary: string;
}

interface PayslipModificationRequest {
  currentPayslip: any;
  requestedChanges: string;
  employeeData?: any;
}

interface PayslipModificationResponse {
  modifiedPayslip: any;
  explanation: string;
  warnings: string[];
  legalCompliance: string[];
}

export class LiaService {
  private client: OpenAI;
  private model: string;

  constructor(config: LiaConfig = {}) {
    this.model = config.model || 'anthropic/claude-3.5-sonnet';
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: config.apiKey || process.env.OPENROUTER_API_KEY || '',
    });
  }

  /**
   * Vérifie la conformité d'un contrat de travail français
   */
  async verifyContractConformity(request: ContractConformityRequest): Promise<ContractConformityResponse> {
    try {
      const systemPrompt = `Tu es Lia, un expert juridique français spécialisé dans les contrats de travail.
Ta mission est de vérifier la conformité des contrats selon le Code du travail français 2024.

Pour chaque type de contrat, vérifie les mentions obligatoires suivantes:

CDI (Articles L. 1221-1 et suivants):
- Identité des parties
- Date de début du contrat
- Période d'essai (si applicable)
- Désignation du poste
- Lieu de travail
- Durée du travail
- Rémunération
- Références aux conventions collectives

CDD (Articles L. 1242-1 et suivants):
- Toutes les mentions du CDI PLUS
- Motif précis du recours au CDD
- Date de fin du contrat
- Clause de retour à l'emploi (si remplacement)
- Indemnité de fin de contrat

Stage (Loi n° 2014-788):
- Convention de tripartite (entreprise, étudiant, établissement)
- Objectifs pédagogiques
- Durée et dates
- Gratification minimale
- Tutor

Apprentissage (Articles L. 6222-1 et suivants):
- Salaires minimums selon l'âge
- Maître d'apprentissage qualifié
- Formation théorique (Centre de Formation d'Apprentis)
- Durée du contrat

Réponds au format JSON avec cette structure:
{
  "isConform": boolean,
  "missingMentions": string[],
  "recommendations": string[],
  "legalReferences": string[],
  "riskLevel": "low" | "medium" | "high",
  "summary": string
}`;

      const userMessage = `Vérifie la conformité de ce ${request.contractType}:

Données du contrat:
${JSON.stringify(request.contractData, null, 2)}

${request.contractContent ? `Contenu du contrat:\n${request.contractContent}` : ''}

Analyse la conformité et identifie les mentions manquantes ou incorrectes.`;

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const response = JSON.parse(completion.choices[0].message.content || '{}');

      return {
        isConform: response.isConform || false,
        missingMentions: response.missingMentions || [],
        recommendations: response.recommendations || [],
        legalReferences: response.legalReferences || [],
        riskLevel: response.riskLevel || 'medium',
        summary: response.summary || '',
      };
    } catch (error) {
      console.error('Erreur vérification conformité:', error);
      return {
        isConform: false,
        missingMentions: ['Erreur lors de la vérification'],
        recommendations: ['Veuillez réessayer ultérieurement'],
        legalReferences: [],
        riskLevel: 'high',
        summary: 'Erreur technique lors de l\'analyse',
      };
    }
  }

  /**
   * Modifie un bulletin de paie selon les demandes
   */
  async modifyPayslip(request: PayslipModificationRequest): Promise<PayslipModificationResponse> {
    try {
      const systemPrompt = `Tu es Lia, expert en paie française.
Tu aides à modifier des bulletins de paie tout en respectant:
- Le Code du travail français
- Les taux de cotisation 2024
- Les SMIC mensuels et plafonds SS
- Les règles de calcul officielles

IMPORTANT: Tous les montants doivent rester conformes à la législation.
Si une modification demandée n'est pas possible légalement, explique pourquoi.

Réponds au format JSON avec cette structure:
{
  "modifiedPayslip": object (données complètes du bulletin modifié),
  "explanation": string (explication des modifications),
  "warnings": string[] (avertissements sur la conformité),
  "legalCompliance": string[] (références légales applicables)
}`;

      const userMessage = `Bulletin de paie actuel:
${JSON.stringify(request.currentPayslip, null, 2)}

Modifications demandées:
${request.requestedChanges}

${request.employeeData ? `Données salarié:\n${JSON.stringify(request.employeeData, null, 2)}` : ''}

Propose les modifications en respectant la législation française.`;

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      const response = JSON.parse(completion.choices[0].message.content || '{}');

      return {
        modifiedPayslip: response.modifiedPayslip || request.currentPayslip,
        explanation: response.explanation || 'Modifications appliquées',
        warnings: response.warnings || [],
        legalCompliance: response.legalCompliance || [],
      };
    } catch (error) {
      console.error('Erreur modification bulletin:', error);
      return {
        modifiedPayslip: request.currentPayslip,
        explanation: 'Erreur lors de la modification',
        warnings: ['Service temporairement indisponible'],
        legalCompliance: [],
      };
    }
  }

  /**
   * Analyse un contrat de travail et suggère des améliorations
   */
  async suggestContractImprovements(contractType: string, contractData: any): Promise<string[]> {
    try {
      const systemPrompt = `Tu es Lia, expert en contrats de travail français.
À partir des données d'un contrat, suggère des améliorations pour:
- Renforcer la protection juridique
- Clarifier les obligations
- Ajouter des clauses utiles
- Améliorer la conformité

Retourne une liste de 3-5 suggestions concrètes, formatées comme liste JSON.`;

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Type: ${contractType}\nDonnées:\n${JSON.stringify(contractData, null, 2)}` },
        ],
        temperature: 0.3,
      });

      const response = JSON.parse(completion.choices[0].message.content || '[]');
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Erreur suggestions contrat:', error);
      return [];
    }
  }

  /**
   * Calcule les cotisations sociales pour un bulletin de paie
   */
  async calculateCotisations(salaireBrut: number, statut: 'cadre' | 'non_cadre' | 'alternance'): Promise<any> {
    try {
      const systemPrompt = `Tu es Lia, expert en paie française.
Calcule les cotisations sociales 2024 pour un salaire brut donné.

Taux à appliquer (2024):
- CSG/CRDS: 9.70% (dont 2.40% imposable)
- Maladie: 7.00%
- Vieillesse déplafonnée: 0.23%
- Vieillesse plafonnée: 6.93%
- Assurance chômage: 2.40% (cadres/non-cadres)
- Retraite complémentaire: variable selon statut
- Cotisations patronales: ~45% du brut

Retourne un objet JSON avec toutes les cotisations détaillées.`;

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Salaire brut: ${salaireBrut}€\nStatut: ${statut}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      return JSON.parse(completion.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Erreur calcul cotisations:', error);
      return {};
    }
  }
}

// Instance singleton pour optimiser les performances avec 1000+ utilisateurs
let liaInstance: LiaService | null = null;

export function getLiaService(config?: LiaConfig): LiaService {
  if (!liaInstance) {
    liaInstance = new LiaService(config);
  }
  return liaInstance;
}
