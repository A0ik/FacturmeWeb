/**
 * Generate HTML contract with the new design based on the provided template
 * This generates a complete HTML document that can be converted to PDF or displayed in browser
 */

export interface ContractHtmlData {
  // Company
  companyName: string;
  companyAddress: string;
  companyPostalCode: string;
  companyCity: string;
  companySiret: string;
  employerName: string;
  employerTitle: string;

  // Employee
  employeeFirstName: string;
  employeeLastName: string;
  employeeAddress: string;
  employeePostalCode: string;
  employeeCity: string;
  employeeEmail?: string;
  employeePhone?: string;
  employeeBirthDate: string;
  employeeSocialSecurity?: string;
  employeeNationality: string;

  // Contract
  contractType: 'cdd' | 'cdi' | 'stage' | 'apprentissage' | 'professionnalisation' | 'interim' | 'portage' | 'freelance';
  contractStartDate: string;
  contractEndDate?: string;
  trialPeriodDays?: string;
  jobTitle: string;
  workLocation: string;
  workSchedule: string;
  salaryAmount: string;
  salaryFrequency: 'monthly' | 'hourly' | 'weekly' | 'flat_rate';
  contractClassification?: string;
  contractReason?: string;
  replacedEmployeeName?: string;

  // Additional
  collectiveAgreement?: string;
  probationClause?: boolean;
  nonCompeteClause?: boolean;
  mobilityClause?: boolean;

  // Benefits
  hasTransport?: boolean;
  hasMeal?: boolean;
  hasHealth?: boolean;
  hasOther?: boolean;
  otherBenefits?: string;

  // Stage/Alternance
  tutorName?: string;
  schoolName?: string;
  speciality?: string;
  objectives?: string;
  tasks?: string;
  durationWeeks?: string;

  // Signatures
  employerSignature?: string;
  employeeSignature?: string;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + (dateStr.length === 10 ? 'T12:00:00' : ''));
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function formatSalary(amount: string, frequency: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return amount;
  const formatted = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  const freqLabels = { monthly: 'par mois', hourly: 'par heure', weekly: 'par semaine', flat_rate: 'forfait' };
  return `${formatted} € (${freqLabels[frequency as keyof typeof freqLabels] || 'par mois'})`;
}

const CONTRACT_LABELS: Record<string, string> = {
  cdd: 'CONTRAT DE TRAVAIL À DURÉE DÉTERMINÉE',
  cdi: 'CONTRAT DE TRAVAIL À DURÉE INDÉTERMINÉE',
  stage: 'CONVENTION DE STAGE',
  apprentissage: 'CONTRAT D\'APPRENTISSAGE',
  professionnalisation: 'CONTRAT DE PROFESSIONNALISATION',
  interim: 'CONTRAT DE TRAVAIL TEMPORAIRE (INTÉRIM)',
  portage: 'CONTRAT DE PORTAGE SALARIAL',
  freelance: 'CONTRAT DE PRESTATION DE SERVICES',
};

const CDD_REASONS: Record<string, string> = {
  remplacement: 'remplacement d\'un salarié absent (art. L.1242-2, 1° du Code du travail)',
  accroissement: 'accroissement temporaire de l\'activité de l\'entreprise (art. L.1242-2, 2° du Code du travail)',
  saisonnier: 'emploi saisonnier dont les tâches se répètent chaque année (art. L.1242-2, 3° du Code du travail)',
  usage: 'secteur d\'activité pour lequel il est d\'usage de ne pas recourir au CDI (art. L.1242-2, 3° du Code du travail)',
};

export function generateContractHTML(data: ContractHtmlData): string {
  const contractTitle = CONTRACT_LABELS[data.contractType] || 'CONTRAT DE TRAVAIL';
  const today = new Date().toISOString().split('T')[0];

  // Calculate trial period end date
  let trialEndDate = '';
  if (data.trialPeriodDays) {
    const trialDate = new Date(data.contractStartDate);
    trialDate.setDate(trialDate.getDate() + parseInt(data.trialPeriodDays));
    trialEndDate = formatDate(trialDate.toISOString().split('T')[0]);
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.companyName} — ${contractTitle} — ${data.employeeFirstName} ${data.employeeLastName}</title>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Source+Sans+3:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #f5f1eb;
            --paper: #fffef9;
            --ink: #1a1a18;
            --ink-light: #4a4a44;
            --ink-muted: #7a7a70;
            --accent: #8b1a1a;
            --accent-light: #a52a2a;
            --rule: #c8c3b8;
            --rule-light: #e0dcd4;
            --confidential-bg: rgba(139, 26, 26, 0.06);
            --shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04);
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Source Sans 3', 'Segoe UI', sans-serif;
            color: var(--ink);
            background: var(--bg);
            line-height: 1.65;
            -webkit-font-smoothing: antialiased;
        }
        body::before {
            content: '';
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: radial-gradient(ellipse at 20% 10%, rgba(139,26,26,0.03) 0%, transparent 50%),
                        radial-gradient(ellipse at 80% 90%, rgba(139,26,26,0.02) 0%, transparent 50%);
            pointer-events: none;
            z-index: 0;
        }
        .document {
            position: relative;
            z-index: 1;
            max-width: 820px;
            margin: 40px auto;
            background: var(--paper);
            box-shadow: var(--shadow);
            border-radius: 2px;
        }
        .page-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 48px;
            border-bottom: 1px solid var(--rule);
            background: var(--confidential-bg);
        }
        .company-name { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 700; font-size: 0.92rem; letter-spacing: 0.08em; }
        .doc-type { font-size: 0.78rem; color: var(--ink-muted); font-weight: 400; }
        .confidential { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); border: 1px solid var(--accent); padding: 3px 10px; border-radius: 2px; }
        .page-body { padding: 44px 56px 36px; min-height: calc(297mm - 100px); }
        .page-footer {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 12px 48px;
            border-top: 1px solid var(--rule-light);
            font-size: 0.72rem;
            color: var(--ink-muted);
            letter-spacing: 0.02em;
        }
        .page-num { font-weight: 600; }
        .separator { margin: 0 12px; color: var(--rule); }
        .contract-title { text-align: center; margin-bottom: 6px; }
        .contract-title h1 { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 700; font-size: 1.55rem; letter-spacing: 0.06em; text-transform: uppercase; }
        .contract-subtitle { text-align: center; font-size: 0.82rem; font-weight: 500; color: var(--ink-muted); letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 32px; }
        .parties-intro { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 700; font-size: 1.05rem; text-align: center; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 28px; }
        .parties-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 28px; }
        .party-block { padding: 20px 22px; border: 1px solid var(--rule); border-radius: 3px; background: linear-gradient(180deg, rgba(139,26,26,0.015) 0%, transparent 100%); }
        .party-label { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 700; font-size: 0.92rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--rule-light); }
        .party-name { font-weight: 700; font-size: 1rem; margin-bottom: 10px; color: var(--ink); }
        .party-details { list-style: none; font-size: 0.85rem; color: var(--ink-light); line-height: 1.8; }
        .party-details li { display: flex; gap: 6px; }
        .party-details li .label { font-weight: 600; color: var(--ink); min-width: fit-content; }
        .transition-phrase { text-align: center; font-style: italic; color: var(--ink-light); margin-bottom: 30px; font-size: 0.92rem; }
        .article { margin-bottom: 22px; }
        .article-title { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 700; font-size: 0.95rem; letter-spacing: 0.06em; color: var(--accent); margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid var(--rule-light); }
        .article p { font-size: 0.88rem; color: var(--ink-light); text-align: justify; margin-bottom: 8px; }
        .recap-table { width: 100%; border-collapse: collapse; margin: 10px 0 4px; font-size: 0.86rem; }
        .recap-table tr { border-bottom: 1px solid var(--rule-light); }
        .recap-table tr:last-child { border-bottom: none; }
        .recap-table td { padding: 9px 12px; vertical-align: top; }
        .recap-label { font-weight: 600; color: var(--ink); white-space: nowrap; width: 170px; }
        .recap-value { color: var(--ink-light); }
        .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-family: 'Cormorant Garamond', Georgia, serif; font-size: 5rem; font-weight: 700; color: rgba(139, 26, 26, 0.025); letter-spacing: 0.15em; text-transform: uppercase; pointer-events: none; white-space: nowrap; z-index: 0; }
        @media print {
            body { background: white; }
            body::before { display: none; }
            .document { margin: 0; box-shadow: none; border-radius: 0; max-width: 100%; }
            .page-break { page-break-before: always; break-before: page; }
            .keep-together { page-break-inside: avoid; break-inside: avoid; }
        }
        @page {
            size: A4;
            margin: 15mm 18mm 20mm 18mm;
        }
    </style>
</head>
<body>
    <div class="document" style="position: relative;">
        <div class="watermark">Confidentiel</div>
        <header class="page-header">
            <div>
                <span class="company-name">${data.companyName}</span>
                <span class="doc-type"> | ${contractTitle}</span>
            </div>
            <span class="confidential">Confidentiel</span>
        </header>
        <main class="page-body">
            <div class="contract-title">
                <h1>${contractTitle}</h1>
            </div>
            <p class="contract-subtitle">Temps plein — SMIC 2026</p>
            <p class="parties-intro">Entre les soussignés</p>
            <div class="parties-grid">
                <div class="party-block">
                    <p class="party-label">L'Employeur</p>
                    <p class="party-name">${data.companyName}</p>
                    <ul class="party-details">
                        <li><span class="label">Adresse :</span> ${data.companyAddress}</li>
                        <li><span class="label">Code postal :</span> ${data.companyPostalCode}</li>
                        <li><span class="label">Ville :</span> ${data.companyCity}</li>
                        <li><span class="label">SIRET :</span> ${data.companySiret}</li>
                        <li><span class="label">Représentant :</span> ${data.employerName}, ${data.employerTitle}</li>
                    </ul>
                </div>
                <div class="party-block">
                    <p class="party-label">Le Salarié</p>
                    <p class="party-name">${data.employeeFirstName} ${data.employeeLastName}</p>
                    <ul class="party-details">
                        <li><span class="label">Né le :</span> ${formatDate(data.employeeBirthDate)}</li>
                        <li><span class="label">Nationalité :</span> ${data.employeeNationality}</li>
                        <li><span class="label">Demeurant :</span> ${data.employeeAddress}, ${data.employeePostalCode} ${data.employeeCity}</li>
                        ${data.employeeEmail ? `<li><span class="label">Email :</span> ${data.employeeEmail}</li>` : ''}
                        ${data.employeePhone ? `<li><span class="label">Téléphone :</span> ${data.employeePhone}</li>` : ''}
                        ${data.employeeSocialSecurity ? `<li><span class="label">N° SS :</span> ${data.employeeSocialSecurity}</li>` : ''}
                    </ul>
                </div>
            </div>
            <p class="transition-phrase">Il a été convenu et arrêté ce qui suit :</p>

            <section class="article">
                <h2 class="article-title">Article Préambule — Récapitulatif des conditions</h2>
                <table class="recap-table">
                    <tr><td class="recap-label">Poste</td><td class="recap-value">${data.jobTitle}</td></tr>
                    ${data.contractClassification ? `<tr><td class="recap-label">Convention collective</td><td class="recap-value">${data.contractClassification}</td></tr>` : ''}
                    <tr><td class="recap-label">Date d'embauche</td><td class="recap-value">${formatDate(data.contractStartDate)}</td></tr>
                    ${data.trialPeriodDays ? `<tr><td class="recap-label">Fin période d'essai</td><td class="recap-value">${trialEndDate} (${data.trialPeriodDays} jours renouvelable une fois)</td></tr>` : ''}
                    <tr><td class="recap-label">Durée du travail</td><td class="recap-value">${data.workSchedule}</td></tr>
                    <tr><td class="recap-label">Salaire brut</td><td class="recap-value">${formatSalary(data.salaryAmount, data.salaryFrequency)}</td></tr>
                    <tr><td class="recap-label">Lieu de travail</td><td class="recap-value">${data.workLocation}</td></tr>
                </table>
            </section>

            <section class="article">
                <h2 class="article-title">Article I — Engagement</h2>
                <p>Sous réserve des résultats de la visite médicale d'embauche, <strong>${data.employeeFirstName} ${data.employeeLastName}</strong> est engagé${data.employeeFirstName.endsWith('e') ? 'e' : ''} à temps plein à compter du ${formatDate(data.contractStartDate)} par la société <strong>${data.companyName}</strong>, en qualité de ${data.jobTitle}.</p>
                ${data.contractClassification ? `<p>Cette qualification correspond au coefficient prévu par la convention collective : ${data.contractClassification}.</p>` : ''}
            </section>

            <section class="article">
                <h2 class="article-title">Article II — Durée du contrat</h2>
                ${data.contractType === 'cdi' ? `
                <p>Le présent contrat est conclu pour une durée indéterminée${data.trialPeriodDays ? `. Il ne prendra effet définitivement qu'à l'issue de la période d'essai de ${data.trialPeriodDays} jours` : ''}.</p>
                <p>Durant la période d'essai, chacune des parties pourra mettre fin au contrat sans indemnité, sous réserve du respect du délai de prévenance prévu par la loi et la convention collective applicable.</p>
                ` : data.contractType === 'cdd' ? `
                <p>Le présent contrat est conclu pour une durée déterminée du ${formatDate(data.contractStartDate)} au ${formatDate(data.contractEndDate || '')}.</p>
                <p>Conformément à l'article L. 1242-1 du Code du travail, ce CDD est conclu pour le motif suivant : ${CDD_REASONS[data.contractReason || ''] || data.contractReason || 'à préciser'}.</p>
                ${data.replacedEmployeeName ? `<p>Nom du salarié remplacé : ${data.replacedEmployeeName}.</p>` : ''}
                ` : `
                <p>Le présent contrat est conclu pour une durée déterminée du ${formatDate(data.contractStartDate)} au ${formatDate(data.contractEndDate || '')}.</p>
                `}
            </section>

            <section class="article">
                <h2 class="article-title">Article III — Fonctions</h2>
                <p><strong>${data.employeeFirstName} ${data.employeeLastName}</strong> exercera au sein de <strong>${data.companyName}</strong> les fonctions de ${data.jobTitle}. Il effectuera toutes les tâches inhérentes à ce poste, dans le respect des instructions et procédures de l'entreprise.</p>
            </section>

            <section class="article">
                <h2 class="article-title">Article IV — Rémunération</h2>
                <p><strong>${data.employeeFirstName} ${data.employeeLastName}</strong> percevra une rémunération brute mensuelle de <strong>${formatSalary(data.salaryAmount, data.salaryFrequency)}</strong>.</p>
                <p>Cette rémunération sera versée mensuellement, déduction faite des cotisations sociales légales en vigueur.</p>
                ${data.hasTransport || data.hasMeal || data.hasHealth || data.hasOther ? `
                <p>Le salarié bénéficiera également des avantages suivants :</p>
                <ul>
                    ${data.hasTransport ? '<li>Prise en charge à 50% des frais de transports en commun</li>' : ''}
                    ${data.hasMeal ? '<li>Titres-restaurant ou indemnité de repas</li>' : ''}
                    ${data.hasHealth ? '<li>Complémentaire santé collective</li>' : ''}
                    ${data.hasOther && data.otherBenefits ? `<li>${data.otherBenefits}</li>` : ''}
                </ul>
                ` : ''}
            </section>

            <section class="article">
                <h2 class="article-title">Article V — Durée du travail</h2>
                <p>La durée mensuelle de travail est fixée à ${data.workSchedule}. Les horaires de travail seront ceux en vigueur dans l'entreprise.</p>
                <p>Des heures supplémentaires pourront être demandées en fonction des nécessités du service, dans le strict respect des dispositions légales et conventionnelles.</p>
            </section>

            <section class="article page-break keep-together">
                <h2 class="article-title">Article VI — Absences — Maladie</h2>
                <p><strong>${data.employeeFirstName} ${data.employeeLastName}</strong> s'engage à informer immédiatement <strong>${data.companyName}</strong> de toute absence, en précisant le motif. Un certificat médical devra être transmis dans un délai de 48 heures à compter du premier jour d'arrêt.</p>
            </section>

            <section class="article keep-together">
                <h2 class="article-title">Article VII — Congés payés</h2>
                <p><strong>${data.employeeFirstName} ${data.employeeLastName}</strong> bénéficiera des congés payés conformément aux articles L. 3141-1 et suivants du Code du travail.</p>
            </section>

            <section class="article keep-together">
                <h2 class="article-title">Article VIII — Discrétion — Non-concurrence</h2>
                <p><strong>${data.employeeFirstName} ${data.employeeLastName}</strong> s'engage à observer la plus stricte confidentialité concernant les informations, procédés et données dont il aura connaissance dans le cadre de ses fonctions.</p>
                ${data.nonCompeteClause ? `<p>Il s'engage également à n'exercer, pendant la durée du contrat, aucune activité concurrente à celle de ${data.companyName}.</p>` : ''}
            </section>

            <section class="article keep-together">
                <h2 class="article-title">Article IX — Rupture du contrat</h2>
                <p>Chacune des parties pourra rompre le présent contrat en respectant les dispositions légales et conventionnelles en vigueur.</p>
            </section>

            <section class="article keep-together">
                <h2 class="article-title">Article X — Dispositions diverses</h2>
                <p><strong>${data.employeeFirstName} ${data.employeeLastName}</strong> déclare avoir pris connaissance du règlement intérieur de <strong>${data.companyName}</strong>.</p>
                <p>Le présent contrat est régi par le droit français. Tout litige relatif à son exécution sera soumis à la juridiction compétente du ressort du siège social de la société.</p>
            </section>

            <p style="text-align: center; font-size: 0.88rem; color: var(--ink-light); margin-top: 36px; margin-bottom: 8px;">
                Fait à ${data.companyCity}, le ${formatDate(today)}, en deux exemplaires originaux.
            </p>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 44px;">
                <div style="text-align: center;">
                    <p style="font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 700; font-size: 0.9rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--accent); margin-bottom: 10px;">Le Salarié</p>
                    <p style="font-weight: 600; font-size: 0.9rem; margin-bottom: 4px;">${data.employeeFirstName} ${data.employeeLastName}</p>
                    <p style="font-size: 0.78rem; font-style: italic; color: var(--ink-muted); margin-bottom: 28px;">(Précédé de la mention « Lu et approuvé »)</p>
                    <hr style="border: none; border-top: 1px solid var(--ink); width: 70%; margin: 0 auto 6px; opacity: 0.35;">
                    <p style="font-size: 0.72rem; color: var(--ink-muted);">Signature</p>
                </div>
                <div style="text-align: center;">
                    <p style="font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 700; font-size: 0.9rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--accent); margin-bottom: 10px;">L'Employeur</p>
                    <p style="font-weight: 600; font-size: 0.9rem; margin-bottom: 4px;">${data.employerName} — ${data.companyName}</p>
                    <p style="font-size: 0.78rem; font-style: italic; color: var(--ink-muted); margin-bottom: 28px;">(Cachet + Signature de l'employeur)</p>
                    <hr style="border: none; border-top: 1px solid var(--ink); width: 70%; margin: 0 auto 6px; opacity: 0.35;">
                    <p style="font-size: 0.72rem; color: var(--ink-muted);">Signature & Cachet</p>
                </div>
            </div>
        </main>
        <footer class="page-footer">
            <span>${data.companyName}</span>
            <span class="separator">—</span>
            <span>SIREN ${data.companySiret.replace(/\s/g, '').substring(0, 9)}</span>
            <span class="separator">—</span>
            <span>${data.companyAddress}, ${data.companyPostalCode} ${data.companyCity}</span>
            <span class="separator">—</span>
            <span class="page-num">Document confidentiel</span>
        </footer>
    </div>
</body>
</html>`;
}
