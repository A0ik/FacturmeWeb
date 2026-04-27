/**
 * Server-side PDF generation for French labor contracts using pdf-lib.
 * Design basé sur le template CDI_ISHAK_AHMED_BS_STRUCTURE_02-02-2026.pdf
 * Couleurs: Vert #1D9E75, structure professionnelle, signatures intégrées
 */
import { PDFDocument, StandardFonts, rgb, RGB } from 'pdf-lib';

export interface ContractTemplateData {
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
  employeeSocialSecurity?: string;
  employeeNationality: string;
  employeeQualification?: string;

  // Contrat
  contractType: 'cdd' | 'cdi' | 'stage' | 'apprentissage' | 'professionnalisation' | 'interim' | 'portage' | 'freelance';
  contractStartDate: string;
  contractEndDate?: string;
  trialPeriodDays?: string;
  jobTitle: string;
  workLocation: string;
  workSchedule: string;
  workingHours?: string;
  salaryAmount: string;
  salaryFrequency: 'monthly' | 'hourly' | 'weekly' | 'flat_rate';
  contractClassification?: string;
  contractReason?: string;
  replacedEmployeeName?: string;

  // Entreprise
  companyName: string;
  companyAddress: string;
  companyPostalCode: string;
  companyCity: string;
  companySiret: string;
  employerName: string;
  employerTitle: string;

  // Avantages
  hasTransport?: boolean;
  hasMeal?: boolean;
  hasHealth?: boolean;
  hasOther?: boolean;
  otherBenefits?: string;

  // Clauses
  collectiveAgreement?: string;
  probationClause?: boolean;
  nonCompeteClause?: boolean;
  mobilityClause?: boolean;

  // Stage / Alternance
  tutorName?: string;
  schoolName?: string;
  speciality?: string;
  objectives?: string;
  tasks?: string;
  durationWeeks?: string;

  // Signatures (base64)
  employerSignature?: string;
  employeeSignature?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function safe(str: unknown): string {
  return String(str ?? '')
    .replace(/\u2013/g, '-').replace(/\u2014/g, '--')
    .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/\u2026/g, '...').replace(/\n/g, ' ')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
}

function hexToRgb(hex: string): RGB {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return rgb(0.549, 0.102, 0.102);
  return rgb(parseInt(r[1], 16) / 255, parseInt(r[2], 16) / 255, parseInt(r[3], 16) / 255);
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + (dateStr.length === 10 ? 'T12:00:00' : ''));
    const months = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return String(dateStr);
  }
}

function formatSalary(amount: string, frequency: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return safe(amount);
  const formatted = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  const freqLabels: Record<string, string> = { monthly: 'par mois', hourly: 'par heure', weekly: 'par semaine', flat_rate: 'forfait' };
  return `${formatted} EUR (${freqLabels[frequency] || 'par mois'})`;
}

const CONTRACT_LABELS: Record<string, string> = {
  cdd: 'CONTRAT DE TRAVAIL A DUREE DETERMINEE',
  cdi: 'CONTRAT DE TRAVAIL A DUREE INDETERMINEE',
  stage: 'CONVENTION DE STAGE',
  apprentissage: "CONTRAT D'APPRENTISSAGE",
  professionnalisation: 'CONTRAT DE PROFESSIONNALISATION',
  interim: 'CONTRAT DE TRAVAIL TEMPORAIRE (INTERIM)',
  portage: 'CONTRAT DE PORTAGE SALARIAL',
  freelance: 'CONTRAT DE PRESTATION DE SERVICES',
};

const CDD_REASONS: Record<string, string> = {
  remplacement: "remplacement d'un salarie absent (art. L.1242-2, 1 du Code du travail)",
  accroissement: "accroissement temporaire de l'activite de l'entreprise (art. L.1242-2, 2 du Code du travail)",
  saisonnier: "emploi saisonnier dont les taches se repetent chaque annee (art. L.1242-2, 3 du Code du travail)",
  usage: "secteur d'activite pour lequel il est d'usage de ne pas recourir au CDI (art. L.1242-2, 3 du Code du travail)",
};

// ── Main PDF Generator ────────────────────────────────────────────────────────

export async function generateContractPdfBuffer(data: ContractTemplateData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const timesBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  // Couleurs du template CDI_ISHAK_AHMED_BS_STRUCTURE_02-02-2026.pdf
  const accent = data.accentColor ? hexToRgb(data.accentColor) : rgb(0.114, 0.619, 0.459); // #1D9E75 - Vert principal
  const accentDark = rgb(0.086, 0.463, 0.341); // #16765B - Vert foncé
  const ink = rgb(0.10, 0.10, 0.09); // Noir texte
  const muted = rgb(0.35, 0.35, 0.35); // Gris texte
  const white = rgb(1, 1, 1);
  const bgLight = rgb(0.96, 0.97, 0.96); // Gris très clair fond sections
  const bgSection = rgb(0.94, 0.95, 0.94); // Gris clair sections
  const ruleLine = rgb(0.82, 0.82, 0.82); // Lignes séparations

  const W = 595.28, H = 841.89;
  const ML = 48, MR = 48;
  const contentW = W - ML - MR;
  const pageBottomY = 55;

  // eslint-disable-next-line prefer-const
  let page!: ReturnType<typeof pdfDoc.addPage>;
  let y = 0;
  let pageCount = 0;

  const contractTitle = CONTRACT_LABELS[data.contractType] || 'CONTRAT DE TRAVAIL';

  function dt(text: string, x: number, yy: number, size: number, font: typeof boldFont, color: RGB) {
    const t = safe(text);
    if (!t) return;
    page.drawText(t, { x, y: yy, size, font, color });
  }

  function ct(text: string, yy: number, size: number, font: typeof boldFont, color: RGB) {
    const t = safe(text);
    const w = font.widthOfTextAtSize(t, size);
    page.drawText(t, { x: (W - w) / 2, y: yy, size, font, color });
  }

  function wrapLines(text: string, maxW: number, font: typeof boldFont, size: number): string[] {
    const lines: string[] = [];
    const words = safe(text).split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function addNewPage() {
    pageCount++;
    page = pdfDoc.addPage([W, H]);
    y = H - 70;

    // Top accent bar (vert comme le template)
    page.drawRectangle({ x: 0, y: H - 8, width: W, height: 8, color: accent });

    // Header strip avec fond gris clair
    page.drawRectangle({ x: 0, y: H - 45, width: W, height: 37, color: bgLight });
    const cnW = boldFont.widthOfTextAtSize(safe(data.companyName).toUpperCase(), 9);
    dt(safe(data.companyName).toUpperCase(), ML, H - 28, 9, boldFont, accent);
    dt(' — ' + contractTitle, ML + cnW + 4, H - 28, 9, regFont, accentDark);

    // CONFIDENTIEL badge (style template)
    const confLabel = 'CONFIDENTIEL';
    const confW = boldFont.widthOfTextAtSize(confLabel, 7);
    page.drawRectangle({ x: W - MR - confW - 16, y: H - 38, width: confW + 16, height: 16, borderColor: accent, borderWidth: 1, color: white });
    dt(confLabel, W - MR - confW - 8, H - 30, 7, boldFont, accent);

    // Footer (style template avec numéro de page)
    const footerText = `${safe(data.companyName)} — SIRET : ${safe(data.companySiret)} — ${new Date().toLocaleDateString('fr-FR')} — Page ${pageCount}`;
    const ftW = timesFont.widthOfTextAtSize(footerText, 6);
    page.drawLine({ start: { x: ML, y: pageBottomY + 18 }, end: { x: W - MR, y: pageBottomY + 18 }, thickness: 0.8, color: accent });
    page.drawText(footerText, { x: (W - ftW) / 2, y: pageBottomY + 6, size: 6, font: timesFont, color: muted });
  }

  function checkY(needed: number) {
    if (y - needed < pageBottomY + 20) addNewPage();
  }

  function drawSectionTitle(title: string) {
    checkY(26);
    // Fond de section (style template)
    page.drawRectangle({ x: ML, y: y - 18, width: contentW, height: 20, color: bgSection, borderColor: accent, borderWidth: 0.8 });
    // Barre latérale accent
    page.drawRectangle({ x: ML, y: y - 18, width: 4, height: 20, color: accent });
    dt(title.toUpperCase(), ML + 10, y - 11, 8.5, boldFont, accent);
    y -= 26;
  }

  function drawBodyText(text: string, indent = 0) {
    const lines = wrapLines(text, contentW - 10 - indent, timesFont, 8.5);
    for (const line of lines) {
      checkY(13);
      dt(line, ML + 5 + indent, y, 8.5, timesFont, ink);
      y -= 13;
    }
  }

  // ── Build contract ──────────────────────────────────────────────────────────

  addNewPage();
  y -= 8;

  // Title
  ct(contractTitle, y, 15, timesBoldFont, accent); // Use accent instead of ink
  y -= 12;
  page.drawRectangle({ x: (W - 150) / 2, y: y - 2, width: 150, height: 2, color: accent }); // underline
  y -= 22;
  ct('Document confidentiel — ' + new Date().toLocaleDateString('fr-FR'), y, 7.5, regFont, muted);
  y -= 28;

  ct('ENTRE LES SOUSSIGNES', y, 9.5, boldFont, accent); // Use accent instead of ink
  y -= 22;

  // Parties grid (style template avec blocs arrondis)
  const halfW = (contentW - 20) / 2;
  const rightBlockX = ML + halfW + 20;
  const blockH = 95;

  checkY(blockH + 20);

  // Employer block (style template)
  page.drawRectangle({ x: ML, y: y - blockH, width: halfW, height: blockH, borderColor: accent, borderWidth: 1.2, color: bgLight });
  page.drawRectangle({ x: ML, y: y - blockH, width: halfW, height: 18, color: accent });
  dt("L'EMPLOYEUR", ML + 6, y - blockH + 5, 8, boldFont, white);
  dt(safe(data.companyName), ML + 6, y - 20, 9.5, boldFont, ink);
  dt(`${safe(data.companyAddress)}`, ML + 6, y - 33, 7.5, regFont, ink);
  dt(`${safe(data.companyPostalCode)} ${safe(data.companyCity)}`, ML + 6, y - 44, 7.5, regFont, ink);
  dt(`SIRET : ${safe(data.companySiret)}`, ML + 6, y - 56, 7.5, regFont, muted);
  dt(`Représentant : ${safe(data.employerName)}`, ML + 6, y - 68, 7.5, regFont, ink);
  dt(safe(data.employerTitle), ML + 6, y - 80, 7.5, regFont, ink);
  dt(`Email : ${data.companyName.toLowerCase().replace(/\s/g, '.')}@example.com`, ML + 6, y - 90, 6.5, regFont, muted);

  // Employee block (style template)
  page.drawRectangle({ x: rightBlockX, y: y - blockH, width: halfW, height: blockH, borderColor: accent, borderWidth: 1.2, color: bgLight });
  page.drawRectangle({ x: rightBlockX, y: y - blockH, width: halfW, height: 18, color: accent });
  dt('LE SALARIE', rightBlockX + 6, y - blockH + 5, 8, boldFont, white);
  dt(`${safe(data.employeeFirstName)} ${safe(data.employeeLastName)}`, rightBlockX + 6, y - 20, 9.5, boldFont, ink);
  dt(`Né(e) le : ${formatDate(data.employeeBirthDate)}`, rightBlockX + 6, y - 33, 7.5, regFont, ink);
  dt(`Nationalité : ${safe(data.employeeNationality)}`, rightBlockX + 6, y - 44, 7.5, regFont, ink);
  dt(`${safe(data.employeeAddress)}`, rightBlockX + 6, y - 56, 7.5, regFont, ink);
  dt(`${safe(data.employeePostalCode)} ${safe(data.employeeCity)}`, rightBlockX + 6, y - 68, 7.5, regFont, ink);
  if (data.employeeEmail) dt(`Email : ${safe(data.employeeEmail)}`, rightBlockX + 6, y - 80, 7.5, regFont, ink);
  if (data.employeePhone) dt(`Tél : ${safe(data.employeePhone)}`, rightBlockX + 6, y - 90, 7.5, regFont, ink);

  y -= blockH + 22;

  ct("Il a ete convenu et arrete ce qui suit :", y, 8.5, timesFont, muted);
  y -= 22;

  // Summary table
  drawSectionTitle('Article Prealable - Recapitulatif des conditions');

  const recap: Array<[string, string]> = [
    ['Poste', data.jobTitle],
    ...(data.contractClassification ? [['Convention collective', data.contractClassification] as [string, string]] : []),
    ['Date d\'embauche', formatDate(data.contractStartDate)],
    ...(data.contractEndDate ? [['Date de fin', formatDate(data.contractEndDate)] as [string, string]] : []),
    ...(data.trialPeriodDays ? [['Periode d\'essai', `${data.trialPeriodDays} jours renouvelable`] as [string, string]] : []),
    ['Duree du travail', data.workSchedule],
    ['Salaire brut', formatSalary(data.salaryAmount, data.salaryFrequency)],
    ['Lieu de travail', data.workLocation],
  ];

  for (const [label, value] of recap) {
    checkY(14);
    dt(`${safe(label)} :`, ML + 5, y, 8.5, boldFont, ink);
    const lines = wrapLines(safe(value), contentW - 175, timesFont, 8.5);
    dt(lines[0] || '', ML + 165, y, 8.5, timesFont, ink);
    y -= 13;
    for (let i = 1; i < lines.length; i++) {
      checkY(13);
      dt(lines[i], ML + 165, y, 8.5, timesFont, ink);
      y -= 13;
    }
    page.drawLine({ start: { x: ML + 5, y: y + 2 }, end: { x: W - MR - 5, y: y + 2 }, thickness: 0.3, color: rgb(0.92, 0.90, 0.87) });
  }
  y -= 6;

  // Articles I–V
  drawSectionTitle('Article I - Engagement');
  drawBodyText(`Sous reserve des resultats de la visite medicale d'embauche, ${safe(data.employeeFirstName)} ${safe(data.employeeLastName)} est engage a temps plein a compter du ${formatDate(data.contractStartDate)} par la societe ${safe(data.companyName)}, en qualite de ${safe(data.jobTitle)}.`);
  if (data.contractClassification) drawBodyText(`Cette qualification correspond au coefficient prevu par la convention collective : ${safe(data.contractClassification)}.`);
  y -= 4;

  drawSectionTitle('Article II - Duree du contrat');
  if (data.contractType === 'cdi') {
    drawBodyText(`Le present contrat est conclu pour une duree indeterminee${data.trialPeriodDays ? `. Il ne prendra effet definitivement qu'a l'issue de la periode d'essai de ${data.trialPeriodDays} jours` : ''}.`);
    drawBodyText(`Durant la periode d'essai, chacune des parties pourra mettre fin au contrat sans indemnite, sous reserve du respect du delai de prevenance prevu par la loi.`);
  } else if (data.contractType === 'cdd') {
    drawBodyText(`Le present contrat est conclu pour une duree determinee du ${formatDate(data.contractStartDate)} au ${formatDate(data.contractEndDate || '')}.`);
    drawBodyText(`Conformement a l'article L. 1242-1 du Code du travail, ce CDD est conclu pour le motif suivant : ${safe(CDD_REASONS[data.contractReason || ''] || data.contractReason || 'a preciser')}.`);
    if (data.replacedEmployeeName) drawBodyText(`Nom du salarie remplace : ${safe(data.replacedEmployeeName)}.`);
  } else {
    drawBodyText(`Le present contrat est conclu du ${formatDate(data.contractStartDate)} au ${formatDate(data.contractEndDate || '')}.`);
  }
  y -= 4;

  drawSectionTitle('Article III - Fonctions');
  drawBodyText(`${safe(data.employeeFirstName)} ${safe(data.employeeLastName)} exercera au sein de ${safe(data.companyName)} les fonctions de ${safe(data.jobTitle)}. Il effectuera toutes les taches inherentes a ce poste, dans le respect des instructions et procedures de l'entreprise.`);
  y -= 4;

  drawSectionTitle('Article IV - Remuneration');
  drawBodyText(`${safe(data.employeeFirstName)} ${safe(data.employeeLastName)} percevra une remuneration brute mensuelle de ${formatSalary(data.salaryAmount, data.salaryFrequency)}.`);
  drawBodyText(`Cette remuneration sera versee mensuellement, deduction faite des cotisations sociales legales en vigueur.`);

  const benefits = [
    data.hasTransport ? 'Prise en charge a 50% des frais de transports en commun' : null,
    data.hasMeal ? 'Titres-restaurant ou indemnite de repas' : null,
    data.hasHealth ? 'Complementaire sante collective' : null,
    data.hasOther && data.otherBenefits ? safe(data.otherBenefits) : null,
  ].filter(Boolean) as string[];

  if (benefits.length > 0) {
    drawBodyText("Le salarie beneficiera egalement des avantages suivants :");
    for (const b of benefits) drawBodyText(`- ${b}`, 12);
  }
  y -= 4;

  drawSectionTitle('Article V - Duree du travail');
  drawBodyText(`La duree mensuelle de travail est fixee a ${safe(data.workSchedule)}. Les horaires de travail seront ceux en vigueur dans l'entreprise.`);
  drawBodyText(`Des heures supplementaires pourront etre demandees en fonction des necessites du service, dans le strict respect des dispositions legales et conventionnelles.`);
  y -= 4;

  drawSectionTitle('Article VI - Absences - Maladie');
  drawBodyText(`${safe(data.employeeFirstName)} ${safe(data.employeeLastName)} s'engage a informer immediatement ${safe(data.companyName)} de toute absence, en precisisant le motif. Un certificat medical devra etre transmis dans un delai de 48 heures a compter du premier jour d'arret.`);
  y -= 4;

  drawSectionTitle('Article VII - Conges payes');
  drawBodyText(`${safe(data.employeeFirstName)} ${safe(data.employeeLastName)} beneficiera des conges payes conformement aux articles L. 3141-1 et suivants du Code du travail.`);
  y -= 4;

  drawSectionTitle('Article VIII - Discretion - Non-concurrence');
  drawBodyText(`${safe(data.employeeFirstName)} ${safe(data.employeeLastName)} s'engage a observer la plus stricte confidentialite concernant les informations, procedes et donnees dont il aura connaissance dans le cadre de ses fonctions.`);
  if (data.nonCompeteClause) drawBodyText(`Il s'engage egalement a n'exercer, pendant la duree du contrat, aucune activite concurrente a celle de ${safe(data.companyName)}.`);
  y -= 4;

  drawSectionTitle('Article IX - Rupture du contrat');
  drawBodyText(`Chacune des parties pourra rompre le present contrat en respectant les dispositions legales et conventionnelles en vigueur.`);
  y -= 4;

  drawSectionTitle('Article X - Dispositions diverses');
  drawBodyText(`${safe(data.employeeFirstName)} ${safe(data.employeeLastName)} declare avoir pris connaissance du reglement interieur de ${safe(data.companyName)}.`);
  drawBodyText(`Le present contrat est regi par le droit francais. Tout litige relatif a son execution sera soumis a la juridiction competente du ressort du siege social de la societe.`);
  y -= 14;

  // "Fait à..."
  checkY(20);
  ct(`Fait a ${safe(data.companyCity)}, le ${formatDate(new Date().toISOString().split('T')[0])}, en deux exemplaires originaux.`, y, 8.5, timesFont, muted);
  y -= 30;

  // Signatures (style template avec blocs bien séparés)
  checkY(140);
  const sigHalfW = (contentW - 30) / 2;
  const sigRightX = ML + sigHalfW + 30;

  // Bloc Signature Salarié
  page.drawRectangle({ x: ML, y: y - 120, width: sigHalfW, height: 120, borderColor: accent, borderWidth: 1.2, color: white });
  page.drawRectangle({ x: ML, y: y - 120, width: sigHalfW, height: 16, color: accent });
  dt('LE SALARIE', ML + 8, y - 115, 7.5, boldFont, white);
  dt(`${safe(data.employeeFirstName)} ${safe(data.employeeLastName)}`, ML + 8, y - 100, 8.5, boldFont, ink);
  dt('Pour servir et valoir ce que de droit', ML + 8, y - 88, 6.5, regFont, muted);

  // Zone signature
  if (data.employeeSignature) {
    try {
      const matches = /^data:image\/(png|jpeg|jpg);base64,(.+)$/.exec(data.employeeSignature);
      if (matches) {
        const bytes = Uint8Array.from(atob(matches[2]), c => c.charCodeAt(0));
        const img = matches[1] === 'png' ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
        const dims = img.scaleToFit(sigHalfW - 25, 45);
        const imgX = ML + 8 + (sigHalfW - 25 - dims.width) / 2;
        page.drawImage(img, { x: imgX, y: y - 75, width: dims.width, height: dims.height });
      }
    } catch { /* ignore */ }
  }

  page.drawLine({ start: { x: ML + 8, y: y - 25 }, end: { x: ML + sigHalfW - 8, y: y - 25 }, thickness: 1, color: accent });
  dt('Date : _____________', ML + 8, y - 18, 6.5, regFont, muted);
  dt('Signature', ML + 8, y - 10, 6.5, regFont, muted);

  // Bloc Signature Employeur
  page.drawRectangle({ x: sigRightX, y: y - 120, width: sigHalfW, height: 120, borderColor: accent, borderWidth: 1.2, color: white });
  page.drawRectangle({ x: sigRightX, y: y - 120, width: sigHalfW, height: 16, color: accent });
  dt("L'EMPLOYEUR", sigRightX + 8, y - 115, 7.5, boldFont, white);
  dt(safe(data.companyName), sigRightX + 8, y - 100, 8.5, boldFont, ink);
  dt('Pour servir et valoir ce que de droit', sigRightX + 8, y - 88, 6.5, regFont, muted);

  // Zone signature
  if (data.employerSignature) {
    try {
      const matches = /^data:image\/(png|jpeg|jpg);base64,(.+)$/.exec(data.employerSignature);
      if (matches) {
        const bytes = Uint8Array.from(atob(matches[2]), c => c.charCodeAt(0));
        const img = matches[1] === 'png' ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
        const dims = img.scaleToFit(sigHalfW - 25, 45);
        const imgX = sigRightX + 8 + (sigHalfW - 25 - dims.width) / 2;
        page.drawImage(img, { x: imgX, y: y - 75, width: dims.width, height: dims.height });
      }
    } catch { /* ignore */ }
  }

  page.drawLine({ start: { x: sigRightX + 8, y: y - 25 }, end: { x: sigRightX + sigHalfW - 8, y: y - 25 }, thickness: 1, color: accent });
  dt('Date : _____________', sigRightX + 8, y - 18, 6.5, regFont, muted);
  dt('Cachet & Signature', sigRightX + 8, y - 10, 6.5, regFont, muted);

  return new Uint8Array(await pdfDoc.save());
}
