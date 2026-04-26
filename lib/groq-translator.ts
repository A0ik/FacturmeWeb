/**
 * Groq-powered translation service for Arabic dialects to French
 * Supports: Modern Standard Arabic, Moroccan, Algerian, Tunisian, Egyptian, Levantine, Gulf dialects
 */
import Groq from 'groq-sdk';

/**
 * Detect if text is Arabic (MSA or dialect)
 */
function isArabicText(text: string): boolean {
  const arabicPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return arabicPattern.test(text);
}

/**
 * Translate Arabic (any dialect) to French using Groq
 */
export async function translateArabicToFrench(text: string): Promise<{ text: string; wasTranslated: boolean }> {
  if (!text || text.trim().length === 0) {
    return { text: '', wasTranslated: false };
  }

  const trimmed = text.trim();

  // Skip if not Arabic
  if (!isArabicText(trimmed)) {
    return { text: trimmed, wasTranslated: false };
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const translation = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `Tu es un traducteur professionnel expert. Ta tâche est de traduire de l'arabe (tous dialectes: marocain, algérien, tunisien, égyptien, libanais, syrien, du Golfe, etc.) vers le français.

RÈGLES IMPORTANTES :
- Traduis avec précision le sens et le contexte, pas mot à mot
- Adapte les expressions dialectales arabes au français professionnel
- Pour les contextes business/facturation/contrats, utilise un français professionnel
- Conserve les noms propres, les montants chiffrés, les dates
- Ne traduis PAS ce qui est déjà en français
- Retourne UNIQUEMENT la traduction française, sans commentaire, sans guillemets

Exemples :
- "أبغى أضيف فاتورة جديدة" → "Je veux ajouter une nouvelle facture"
- "المبلغ ألف يورو" → "Le montant est de 1000 euros"
- "بدنا نعقد موظف جديد" → "Nous voulons embaucher un nouveau salarié"
- "الراتب 3000 درهم" → "Le salaire est de 3000 dirhams"`,
        },
        {
          role: 'user',
          content: trimmed,
        },
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    const translated = translation.choices[0]?.message?.content?.trim() || trimmed;

    // Double-check: if result still contains Arabic, try alternative approach
    if (isArabicText(translated)) {
      console.warn('[Groq Translator] Translation still contains Arabic, using original');
      return { text: trimmed, wasTranslated: false };
    }

    return { text: translated, wasTranslated: true };
  } catch (error) {
    console.error('[Groq Translator] Translation error:', error);
    // Fallback: return original text
    return { text: trimmed, wasTranslated: false };
  }
}

/**
 * Process transcript with Arabic detection and translation
 */
export async function processVoiceTranscript(rawTranscript: string): Promise<{
  transcript: string;
  wasTranslated: boolean;
  originalLanguage: 'arabic' | 'french' | 'unknown';
}> {
  if (!rawTranscript || rawTranscript.trim().length === 0) {
    return { transcript: '', wasTranslated: false, originalLanguage: 'unknown' };
  }

  const result = await translateArabicToFrench(rawTranscript);

  // Detect original language
  let originalLanguage: 'arabic' | 'french' | 'unknown' = 'unknown';
  if (result.wasTranslated) {
    originalLanguage = 'arabic';
  } else if (/[a-zA-Zàâäéèêëïîôùûüç]/.test(rawTranscript)) {
    originalLanguage = 'french';
  }

  return {
    transcript: result.text,
    wasTranslated: result.wasTranslated,
    originalLanguage,
  };
}
