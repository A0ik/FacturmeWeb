/**
 * Service Lia - AI Assistant pour contrats et bulletins de paie
 * Optimisé pour le coût avec modèles légers via OpenRouter
 * Utilise des modèles gratuits avec fallback automatique
 */

import OpenAI from 'openai';
import { FALLBACK_MODELS, getBestFreeModel, estimateCost } from './ai-models-config';

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
  private fallbackModels: string[];

  constructor(config: LiaConfig = {}) {
    // Utiliser les modèles gratuits avec fallback
    this.fallbackModels = FALLBACK_MODELS;
    this.model = config.model || getBestFreeModel();

    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: config.apiKey || process.env.OPENROUTER_API_KEY || '',
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'FACTU.ME',
      },
    });

    console.log('[LIA] Service initialisé avec modèle:', this.model);
  }

  /**
   * Vérifie la conformité d'un contrat de travail français
   * Optimisé avec modèles légers gratuits
   */
  async verifyContractConformity(request: ContractConformityRequest): Promise<ContractConformityResponse> {
    const systemPrompt = `Expert juridique français. Vérifie conformité contrats travail.
JSON uniquement: {isConform:true/false, missingMentions:[], recommendations:[], legalReferences:[], riskLevel:"low/medium/high", summary:"..."}`;

    const userMessage = `Type: ${request.contractType} | Données: ${JSON.stringify(request.contractData)}`;

    // Essayer avec plusieurs modèles
    for (const model of [this.model, ...this.fallbackModels.slice(1)]) {
      try {
        const completion = await this.client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 1200, // Optimisé pour les modèles légers
        });

        // Logging des coûts
        if (completion.usage) {
          const cost = estimateCost(model, completion.usage.prompt_tokens, completion.usage.completion_tokens);
          console.log('[LIA] Coût conformité:', cost.toFixed(4), 'USD');
        }

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
        console.log(`[LIA] Échec conformité ${model}`);
        continue;
      }
    }

    // Fallback
    return {
      isConform: false,
      missingMentions: ['Service IA indisponible'],
      recommendations: ['Vérifiez manuellement les mentions obligatoires'],
      legalReferences: [],
      riskLevel: 'medium',
      summary: 'Erreur technique - Veuillez réessayer',
    };
  }

  /**
   * Modifie un bulletin de paie selon les demandes
   * Optimisé avec modèles légers gratuits + fallback
   */
  async modifyPayslip(request: PayslipModificationRequest): Promise<PayslipModificationResponse> {
    const systemPrompt = `Expert paie française. Modifie bulletins en respectant le Code du travail.
JSON uniquement: {modifiedPayslip:{}, explanation:"", warnings:[], legalCompliance:[]}`;

    const userMessage = `Bulletin: ${JSON.stringify(request.currentPayslip)} | Demande: ${request.requestedChanges}`;

    // Essayer avec plusieurs modèles (du plus léger au plus robuste)
    const modelsToTry = [this.model, ...this.fallbackModels.slice(1)];

    for (const model of modelsToTry) {
      try {
        console.log('[LIA] Tentative modèle:', model);

        const completion = await this.client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
          max_tokens: 1500, // Réduit pour les modèles légers
        });

        // Logging des coûts
        if (completion.usage) {
          const cost = estimateCost(model, completion.usage.prompt_tokens, completion.usage.completion_tokens);
          console.log('[LIA] Coût requête:', cost.toFixed(4), 'USD | Tokens:', completion.usage.total_tokens);
        }

        const response = JSON.parse(completion.choices[0].message.content || '{}');

        return {
          modifiedPayslip: response.modifiedPayslip || request.currentPayslip,
          explanation: response.explanation || 'Modifications appliquées',
          warnings: response.warnings || [],
          legalCompliance: response.legalCompliance || [],
        };
      } catch (error) {
        console.log(`[LIA] Échec ${model}:`, error instanceof Error ? error.message : error);
        continue; // Modèle suivant
      }
    }

    // Tous les modèles échouent
    return {
      modifiedPayslip: request.currentPayslip,
      explanation: 'Service IA temporairement indisponible. Veuillez réessayer.',
      warnings: ['Tous les modèles IA sont indisponibles'],
      legalCompliance: [],
    };
  }

  /**
   * Calcule les cotisations sociales pour un bulletin de paie
   * Note: Cette fonction utilise les calculs locaux pour économiser les appels API
   */
  async calculateCotisations(salaireBrut: number, statut: 'cadre' | 'non_cadre' | 'alternance'): Promise<any> {
    // Utiliser les calculs locaux existants au lieu de l'IA
    // pour économiser les coûts et améliorer la vitesse
    const { calculerCotisations } = await import('../labor-law/cotisations');
    return calculerCotisations({
      salaireBrut,
      salaireBrutAnnuel: salaireBrut * 12,
      statut,
    });
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
