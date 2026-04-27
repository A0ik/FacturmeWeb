/**
 * Service d'export de contrats au format DOCX (Word)
 * Utilise la bibliothèque docx.js pour générer des documents Word modifiables
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, convertInchesToTwip } from 'docx';

export interface ContractData {
  accentColor?: string;

  // Salarié
  employeeFirstName: string;
  employeeLastName: string;
  employeeAddress: string;
  employeePostalCode: string;
  employeeCity: string;
  employeeEmail?: string;
  employeePhone?: string;
  employeeBirthDate: string;
  employeeBirthPlace?: string;
  employeeSocialSecurity?: string;
  employeeNationality: string;
  employeeQualification?: string;

  // Contrat
  contractType: 'cdd' | 'cdi' | 'stage' | 'apprentissage' | 'professionnalisation' | 'interim' | 'portage' | 'freelance';
  contractStartDate: string;
  contractEndDate?: string;
  trialPeriodDays?: string;
  trialPeriodRenewable?: boolean;
  jobTitle: string;
  jobDescription?: string;
  workLocation: string;
  workSchedule: string;
  workingHours?: string;
  salaryAmount: string;
  salaryFrequency: 'monthly' | 'hourly' | 'weekly' | 'flat_rate';
  contractClassification?: string;
  contractCoefficient?: string;
  contractClassificationCode?: string;
  contractReason?: string;
  replacedEmployeeName?: string;

  // Entreprise
  companyName: string;
  companyAddress: string;
  companyPostalCode: string;
  companyCity: string;
  companySiret: string;
  companyAPE?: string;
  companyRCS?: string;
  employerName: string;
  employerTitle: string;

  // Avantages
  hasTransport?: boolean;
  hasMeal?: boolean;
  hasHealth?: boolean;
  hasOther?: boolean;
  otherBenefits?: string;
  transportPercentage?: number;
  mealTicketAmount?: number;
  healthInsuranceAmount?: number;

  // Clauses
  collectiveAgreement?: string;
  collectiveAgreementIdcc?: string;
  probationClause?: boolean;
  nonCompeteClause?: boolean;
  nonCompeteDuration?: string;
  nonCompeteArea?: string;
  nonCompeteCompensation?: string;
  mobilityClause?: boolean;
  mobilityArea?: string;
  confidentialityClause?: boolean;

  // Stage / Alternance
  tutorName?: string;
  tutorJob?: string;
  schoolName?: string;
  schoolAddress?: string;
  schoolContact?: string;
  speciality?: string;
  objectives?: string;
  tasks?: string;
  durationWeeks?: string;
  internshipGratification?: string;
  opcoName?: string;
  cfaName?: string;
  diplomaTitle?: string;
  diplomaLevel?: string;

  // Congés et absences
  vacationDays?: number;
  probationNoticeDays?: number;
  noticePeriodEmployer?: string;
  noticePeriodEmployee?: string;

  // Signatures
  employerSignature?: string;
  employeeSignature?: string;
  employerSignatureDate?: string;
  employeeSignatureDate?: string;
  signatureCity?: string;
  signatureDate?: string;
}

/**
 * Génère un document DOCX pour un contrat
 */
export async function generateContractDOCX(data: ContractData): Promise<Blob> {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Titre du document
        new Paragraph({
          text: getContractTitle(data.contractType),
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: convertInchesToTwip(0.3) }
        }),

        // Référence légale
        new Paragraph({
          text: getLegalReference(data.contractType),
          alignment: AlignmentType.CENTER,
          spacing: { after: convertInchesToTwip(0.5) }
        }),

        // Entreprise et Salarié
        ...generatePartiesSection(data),

        // Informations clés
        ...generateKeyInfoSection(data),

        // Articles du contrat
        ...generateArticles(data),

        // Signatures
        ...generateSignatureSection(data)
      ]
    }]
  });

  // Générer le blob DOCX
  const buffer = await Packer.toBuffer(doc);
  return new Blob([new Uint8Array(buffer)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
}

/**
 * Retourne le titre du contrat selon le type
 */
function getContractTitle(type: string): string {
  const titles: Record<string, string> = {
    cdd: 'CONTRAT DE TRAVAIL À DURÉE DÉTERMINÉE',
    cdi: 'CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE',
    stage: 'CONVENTION DE STAGE',
    apprentissage: "CONTRAT D'APPRENTISSAGE",
    professionnalisation: 'CONTRAT DE PROFESSIONNALISATION',
    interim: 'CONTRAT DE MISSION TEMPORAIRE',
    portage: 'CONTRAT DE PORTAGE SALARIAL',
    freelance: 'CONTRAT DE PRESTATION DE SERVICES'
  };
  return titles[type] || 'CONTRAT DE TRAVAIL';
}

/**
 * Retourne la référence légale
 */
function getLegalReference(type: string): string {
  const refs: Record<string, string> = {
    cdd: 'Réf : Articles L.1242-1 et suivants du Code du travail',
    cdi: 'Réf : Articles L.1221-1 et suivants du Code du travail',
    stage: 'Réf : Articles L.124-1 et suivants du Code de l\'éducation',
    apprentissage: 'Réf : Articles L.6211-1 et suivants du Code du travail',
    professionnalisation: 'Réf : Articles L.6325-1 et suivants du Code du travail'
  };
  return refs[type] || 'Réf : Code du travail';
}

/**
 * Génère la section des parties (entreprise et salarié)
 */
function generatePartiesSection(data: ContractData): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Entreprise
  paragraphs.push(
    new Paragraph({
      text: `ENTRE : ${data.companyName}`,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: convertInchesToTwip(0.2), after: convertInchesToTwip(0.1) }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Adresse : ', bold: true }),
        new TextRun(`${data.companyAddress}, ${data.companyPostalCode} ${data.companyCity}\n`)
      ],
      spacing: { after: convertInchesToTwip(0.1) }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'SIRET : ', bold: true }),
        new TextRun(`${data.companySiret}\n`)
      ],
      spacing: { after: convertInchesToTwip(0.1) }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Représentée par : ', bold: true }),
        new TextRun(`${data.employerName}, ${data.employerTitle}\n`)
      ],
      spacing: { after: convertInchesToTwip(0.3) }
    })
  );

  // Salarié
  paragraphs.push(
    new Paragraph({
      text: `ET : ${data.employeeFirstName} ${data.employeeLastName}`,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: convertInchesToTwip(0.2), after: convertInchesToTwip(0.1) }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Adresse : ', bold: true }),
        new TextRun(`${data.employeeAddress}, ${data.employeePostalCode} ${data.employeeCity}\n`)
      ],
      spacing: { after: convertInchesToTwip(0.1) }
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Né(e) le : ', bold: true }),
        new TextRun(`${formatDate(data.employeeBirthDate)}`)
      ],
      spacing: { after: convertInchesToTwip(0.1) }
    })
  );

  if (data.employeeEmail || data.employeePhone) {
    const contactInfo = [data.employeeEmail, data.employeePhone].filter(Boolean).join(' - ');
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Contact : ', bold: true }),
          new TextRun(contactInfo)
        ],
        spacing: { after: convertInchesToTwip(0.3) }
      })
    );
  }

  return paragraphs;
}

/**
 * Génère la section des informations clés
 */
function generateKeyInfoSection(data: ContractData): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      text: 'IL A ÉTÉ CONVENU CE QUI SUIT :',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: convertInchesToTwip(0.2), after: convertInchesToTwip(0.2) }
    })
  );

  // Tableau des informations clés
  const keyInfo = [
    [`Poste occupé`, data.jobTitle],
    [`Date de début`, formatDate(data.contractStartDate)],
    data.contractEndDate ? [`Date de fin`, formatDate(data.contractEndDate)] : null,
    [`Lieu de travail`, data.workLocation],
    [`Horaires`, data.workSchedule],
    [`Salaire`, `${data.salaryAmount}€ ${getSalaryLabel(data.salaryFrequency)}`],
    data.trialPeriodDays ? [`Période d'essai`, `${data.trialPeriodDays} jours`] : null,
    data.contractClassification ? [`Classification`, data.contractClassification] : null,
    data.collectiveAgreement ? [`Convention collective`, data.collectiveAgreement] : null
  ].filter(Boolean) as [string, string][];

  for (const [label, value] of keyInfo) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${label} : `, bold: true }),
          new TextRun(value)
        ],
        spacing: { after: convertInchesToTwip(0.1) }
      })
    );
  }

  return paragraphs;
}

/**
 * Génère les articles du contrat
 */
function generateArticles(data: ContractData): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  let articleNumber = 1;

  // Article 1 - Objet
  paragraphs.push(
    new Paragraph({
      text: `Article ${articleNumber++} - Objet`,
      heading: HeadingLevel.HEADING_3,
      spacing: { before: convertInchesToTwip(0.2), after: convertInchesToTwip(0.1) }
    }),
    new Paragraph({
      text: getArticleObjet(data),
      spacing: { after: convertInchesToTwip(0.2) }
    })
  );

  // Article 2 - Durée
  paragraphs.push(
    new Paragraph({
      text: `Article ${articleNumber++} - Durée`,
      heading: HeadingLevel.HEADING_3,
      spacing: { before: convertInchesToTwip(0.2), after: convertInchesToTwip(0.1) }
    }),
    new Paragraph({
      text: getArticleDuree(data),
      spacing: { after: convertInchesToTwip(0.2) }
    })
  );

  // Article 3 - Rémunération
  paragraphs.push(
    new Paragraph({
      text: `Article ${articleNumber++} - Rémunération`,
      heading: HeadingLevel.HEADING_3,
      spacing: { before: convertInchesToTwip(0.2), after: convertInchesToTwip(0.1) }
    }),
    new Paragraph({
      text: getArticleRemuneration(data),
      spacing: { after: convertInchesToTwip(0.2) }
    })
  );

  // Article 4 - Lieu de travail
  paragraphs.push(
    new Paragraph({
      text: `Article ${articleNumber++} - Lieu de travail`,
      heading: HeadingLevel.HEADING_3,
      spacing: { before: convertInchesToTwip(0.2), after: convertInchesToTwip(0.1) }
    }),
    new Paragraph({
      text: `Le lieu de travail habituel est fixé à : ${data.workLocation}.`,
      spacing: { after: convertInchesToTwip(0.2) }
    })
  );

  // Clause de non-concurrence (si applicable)
  if (data.nonCompeteClause && data.nonCompeteCompensation) {
    paragraphs.push(
      new Paragraph({
        text: `Article ${articleNumber++} - Clause de non-concurrence`,
        heading: HeadingLevel.HEADING_3,
        spacing: { before: convertInchesToTwip(0.2), after: convertInchesToTwip(0.1) }
      }),
      new Paragraph({
        text: getArticleNonConcurrence(data),
        spacing: { after: convertInchesToTwip(0.2) }
      })
    );
  }

  return paragraphs;
}

/**
 * Génère la section des signatures
 */
function generateSignatureSection(data: ContractData): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      text: '',
      spacing: { after: convertInchesToTwip(0.5) }
    }),
    new Paragraph({
      text: 'FAIT À _________________',
      alignment: AlignmentType.RIGHT,
      spacing: { after: convertInchesToTwip(0.5) }
    }),
    new Paragraph({
      text: `En deux exemplaires originaux,`
    }),
    new Paragraph({
      text: `Pour l'employeur\t\t\t\t\t\tPour le salarié`,
      alignment: AlignmentType.CENTER,
      spacing: { after: convertInchesToTwip(1) }
    }),
    new Paragraph({
      text: `\n\n\n\n${data.companyName}\t\t\t\t\t\t${data.employeeFirstName} ${data.employeeLastName}\n\n\n`,
      alignment: AlignmentType.CENTER,
      spacing: { after: convertInchesToTwip(1) }
    }),
    new Paragraph({
      text: 'Signature\t\t\t\t\t\t\t\t\tSignature',
      alignment: AlignmentType.CENTER,
      spacing: { after: convertInchesToTwip(0.2) }
    })
  );

  return paragraphs;
}

// Helpers pour générer le contenu des articles
function getArticleObjet(data: ContractData): string {
  return `${data.companyName} engage ${data.employeeFirstName} ${data.employeeLastName} à compter du ${formatDate(data.contractStartDate)} en qualité de ${data.jobTitle}.`;
}

function getArticleDuree(data: ContractData): string {
  switch (data.contractType) {
    case 'cdi':
      return 'Le présent contrat est conclu pour une durée indéterminée.';
    case 'cdd':
      return `Le présent contrat est conclu pour une durée déterminée du ${formatDate(data.contractStartDate)} au ${formatDate(data.contractEndDate!)}.`;
    case 'stage':
      return `Le stage se déroulera du ${formatDate(data.contractStartDate)} au ${formatDate(data.contractEndDate!)}, soit une durée de ${data.durationWeeks || '___'} semaines.`;
    default:
      return 'Le contrat est conclu selon les modalités définies ci-dessus.';
  }
}

function getArticleRemuneration(data: ContractData): string {
  let remuneration = `En contrepartie de son travail, le salarié percevra un salaire de ${data.salaryAmount}€ ${getSalaryLabel(data.salaryFrequency)}.`;

  const avantages: string[] = [];
  if (data.hasTransport) avantages.push('remboursement 50% titre de transport');
  if (data.hasMeal) avantages.push('titres restaurant');
  if (data.hasHealth) avantages.push('mutuelle d\'entreprise');

  if (avantages.length > 0) {
    remuneration += `\n\nAvantages en nature : ${avantages.join(', ')}.`;
  }

  return remuneration;
}

function getArticleNonConcurrence(data: ContractData): string {
  return `En contrepartie d'une indemnité mensuelle compensatrice de ${data.nonCompeteCompensation}€ brut, le salarié s'engage à ne pas exercer d'activité concurrente pendant une durée de 12 mois suivant la rupture du contrat.

Cette clause respecte les conditions de validité posées par les articles L1227-1 et suivants du Code du travail (limitation dans le temps, l'espace et l'activité, et contrepartie financière).`;
}

/**
 * Formate une date au format français
 */
function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR');
  } catch {
    return dateStr;
  }
}

/**
 * Retourne le label de la fréquence de salaire
 */
function getSalaryLabel(freq: string): string {
  const labels: Record<string, string> = {
    monthly: 'brut mensuel',
    hourly: 'brut horaire',
    weekly: 'brut hebdomadaire',
    flat_rate: 'forfait brut'
  };
  return labels[freq] || freq;
}
