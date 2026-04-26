/**
 * Server-side PDF generation for French labor contracts using pdf-lib.
 * Multi-page, colored sections, page numbers in footer.
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

  const accent = data.accentColor ? hexToRgb(data.accentColor) : rgb(0.549, 0.102, 0.102);
  const ink = rgb(0.10, 0.10, 0.09);
  const muted = rgb(0.42, 0.45, 0.50);
  const white = rgb(1, 1, 1);
  const bgLight = rgb(0.98, 0.97, 0.95);
  const ruleLine = rgb(0.85, 0.82, 0.78);

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

    // Top accent bar
    page.drawRectangle({ x: 0, y: H - 7, width: W, height: 7, color: accent });

    // Header strip
    page.drawRectangle({ x: 0, y: H - 40, width: W, height: 33, color: bgLight });
    const cnW = boldFont.widthOfTextAtSize(safe(data.companyName).toUpperCase(), 8);
    dt(safe(data.companyName).toUpperCase(), ML, H - 26, 8, boldFont, accent);
    dt(' | ' + contractTitle, ML + cnW, H - 26, 8, regFont, muted);

    // CONFIDENTIEL badge
    const confLabel = 'CONFIDENTIEL';
    const confW = boldFont.widthOfTextAtSize(confLabel, 7);
    page.drawRectangle({ x: W - MR - confW - 14, y: H - 34, width: confW + 14, height: 14, borderColor: accent, borderWidth: 0.5, color: white });
    dt(confLabel, W - MR - confW - 7, H - 28, 7, boldFont, accent);

    // Footer
    const footerText = `${safe(data.companyName)} — SIRET ${safe(data.companySiret).replace(/\s/g, '').substring(0, 9)} — Page ${pageCount}`;
    const ftW = timesFont.widthOfTextAtSize(footerText, 6.5);
    page.drawLine({ start: { x: ML, y: pageBottomY + 16 }, end: { x: W - MR, y: pageBottomY + 16 }, thickness: 0.5, color: ruleLine });
    page.drawText(footerText, { x: (W - ftW) / 2, y: pageBottomY, size: 6.5, font: timesFont, color: muted });
  }

  function checkY(needed: number) {
    if (y - needed < pageBottomY + 20) addNewPage();
  }

  function drawSectionTitle(title: string) {
    checkY(24);
    page.drawRectangle({ x: ML, y: y - 16, width: contentW, height: 18, color: bgLight, borderColor: ruleLine, borderWidth: 0.5 });
    page.drawRectangle({ x: ML, y: y - 16, width: 3, height: 18, color: accent });
    dt(title, ML + 8, y - 11, 8.5, boldFont, accent);
    y -= 24;
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

  // Parties grid
  const halfW = (contentW - 16) / 2;
  const rightBlockX = ML + halfW + 16;
  const blockH = 82;

  checkY(blockH + 16);

  // Employer block
  page.drawRectangle({ x: ML, y: y - blockH, width: halfW, height: blockH, borderColor: ruleLine, borderWidth: 0.5, color: bgLight });
  page.drawRectangle({ x: ML, y: y - blockH, width: halfW, height: 15, color: accent });
  dt("L'EMPLOYEUR", ML + 5, y - blockH + 4, 7.5, boldFont, white);
  dt(safe(data.companyName), ML + 5, y - 18, 9, boldFont, ink);
  dt(`${safe(data.companyAddress)}, ${safe(data.companyPostalCode)} ${safe(data.companyCity)}`, ML + 5, y - 30, 7.5, regFont, muted);
  dt(`SIRET : ${safe(data.companySiret)}`, ML + 5, y - 42, 7.5, regFont, muted);
  dt(`Representant : ${safe(data.employerName)}`, ML + 5, y - 54, 7.5, regFont, muted);
  dt(safe(data.employerTitle), ML + 5, y - 66, 7.5, regFont, muted);

  // Employee block
  page.drawRectangle({ x: rightBlockX, y: y - blockH, width: halfW, height: blockH, borderColor: ruleLine, borderWidth: 0.5, color: bgLight });
  page.drawRectangle({ x: rightBlockX, y: y - blockH, width: halfW, height: 15, color: accent });
  dt('LE SALARIE', rightBlockX + 5, y - blockH + 4, 7.5, boldFont, white);
  dt(`${safe(data.employeeFirstName)} ${safe(data.employeeLastName)}`, rightBlockX + 5, y - 18, 9, boldFont, ink);
  dt(`Ne le : ${formatDate(data.employeeBirthDate)}`, rightBlockX + 5, y - 30, 7.5, regFont, muted);
  dt(`Nationalite : ${safe(data.employeeNationality)}`, rightBlockX + 5, y - 42, 7.5, regFont, muted);
  dt(`${safe(data.employeeAddress)}, ${safe(data.employeePostalCode)} ${safe(data.employeeCity)}`, rightBlockX + 5, y - 54, 7.5, regFont, muted);
  if (data.employeeEmail) dt(`Email : ${safe(data.employeeEmail)}`, rightBlockX + 5, y - 66, 7.5, regFont, muted);

  y -= blockH + 18;

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

  // Signatures (Forcing space if not enough)
  checkY(130);
  const sigHalfW = (contentW - 40) / 2;
  const sigRightX = ML + sigHalfW + 40;

  // Draw light borders around signature boxes for better distinction
  page.drawRectangle({ x: ML, y: y - 110, width: sigHalfW, height: 110, borderColor: ruleLine, borderWidth: 0.5, color: bgLight });
  page.drawRectangle({ x: sigRightX, y: y - 110, width: sigHalfW, height: 110, borderColor: ruleLine, borderWidth: 0.5, color: bgLight });

  dt('LE SALARIE', ML + 10, y - 15, 9, boldFont, accent);
  dt(`${safe(data.employeeFirstName)} ${safe(data.employeeLastName)}`, ML + 10, y - 30, 9, boldFont, ink);
  dt('(Precede de la mention "Lu et approuve")', ML + 10, y - 42, 7.5, timesFont, muted);

  if (data.employeeSignature) {
    try {
      const matches = /^data:image\/(png|jpeg|jpg);base64,(.+)$/.exec(data.employeeSignature);
      if (matches) {
        const bytes = Uint8Array.from(atob(matches[2]), c => c.charCodeAt(0));
        const img = matches[1] === 'png' ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
        const dims = img.scaleToFit(sigHalfW - 20, 50);
        const imgX = ML + 10 + (sigHalfW - 20 - dims.width) / 2;
        page.drawImage(img, { x: imgX, y: y - 100, width: dims.width, height: dims.height });
      }
    } catch { /* ignore */ }
  }

  page.drawLine({ start: { x: ML + 10, y: y - 55 }, end: { x: ML + sigHalfW - 10, y: y - 55 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  dt('Signature', ML + 10, y - 68, 7.5, timesFont, muted);

  dt("L'EMPLOYEUR", sigRightX + 10, y - 15, 9, boldFont, accent);
  dt(`${safe(data.companyName)}`, sigRightX + 10, y - 30, 9, boldFont, ink);
  dt("(Cachet + Signature de l'employeur)", sigRightX + 10, y - 42, 7.5, timesFont, muted);

  if (data.employerSignature) {
    try {
      const matches = /^data:image\/(png|jpeg|jpg);base64,(.+)$/.exec(data.employerSignature);
      if (matches) {
        const bytes = Uint8Array.from(atob(matches[2]), c => c.charCodeAt(0));
        const img = matches[1] === 'png' ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
        const dims = img.scaleToFit(sigHalfW - 20, 50);
        const imgX = sigRightX + 10 + (sigHalfW - 20 - dims.width) / 2;
        page.drawImage(img, { x: imgX, y: y - 100, width: dims.width, height: dims.height });
      }
    } catch { /* ignore */ }
  }

  page.drawLine({ start: { x: sigRightX + 10, y: y - 55 }, end: { x: sigRightX + sigHalfW - 10, y: y - 55 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  dt('Signature & Cachet', sigRightX + 10, y - 68, 7.5, timesFont, muted);

  return new Uint8Array(await pdfDoc.save());
}
