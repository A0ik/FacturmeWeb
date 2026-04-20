/**
 * Factur-X PDF Generator
 *
 * Génère un PDF Factur-X conforme (PDF + XML embarqué selon EN 16931)
 * Compatible avec la réforme française de facturation électronique 2026+
 *
 * Ressources :
 * - Spécifications Factur-X : https://fnfe-mpe.org/factur-x/
 * - Validateurs recommandés : https://fnfe-mpe.org/factur-x/ (voir section validateurs)
 * - Guide DGFiP : https://www.economie.gouv.fr/files/files/directions_services/entreprehonne/Facturation_electronique/Guide_pratique_facturation_electronique.pdf
 */

import { PDFDocument, PDFDict, PDFName, PDFString, PDFArray, PDFHexString, PDFStream } from 'pdf-lib';
import { Invoice, Profile } from '@/types';

// ── Types Factur-X ─────────────────────────────────────────────────────────────

export type FacturXProfile = 'MINIMUM' | 'BASIC WL' | 'BASIC' | 'EN 16931' | 'EXTENDED';

export interface FacturXMetadata {
  profile: FacturXProfile;
  version: '1.0';
  customization: 'urn:factur-x.eu:1p0:en16931';
}

// ── Génération du XML Factur-X ──────────────────────────────────────────────────

function escapeXml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDateFacturX(dateStr: string): string {
  if (!dateStr) return '';
  // Format YYYYMMDD
  const cleaned = dateStr.replace(/-/g, '').slice(0, 8);
  // Validation basique
  if (cleaned.length !== 8 || !/^\d{8}$/.test(cleaned)) {
    throw new Error(`Date invalide: ${dateStr}`);
  }
  return cleaned;
}

function formatCurrencyFacturX(amount: number): string {
  // Format avec 2 décimales, point comme séparateur décimal
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error(`Montant invalide: ${amount}`);
  }
  return amount.toFixed(2);
}

function getVatCategoryCode(vatRate: number): string {
  // Codes de catégorie TVA selon EN 16931
  if (vatRate === 0) return 'E'; // Exempté
  return 'S'; // Standard
}

/**
 * Génère le XML Factur-X conformément au profil EN 16931
 */
export function generateFacturXXml(invoice: Invoice, profile: Profile): string {
  const currency = profile.currency || 'EUR';

  // Validation des données requises
  if (!invoice.number?.trim()) {
    throw new Error('Numéro de facture manquant');
  }

  if (!invoice.issue_date) {
    throw new Error('Date d\'émission manquante');
  }

  if (!invoice.items || invoice.items.length === 0) {
    throw new Error('Aucune ligne de facturation');
  }

  if (!profile.company_name?.trim()) {
    throw new Error('Nom de l\'entreprise manquant');
  }

  // ExchangedDocument - Informations document
  const docId = escapeXml(invoice.number.trim());
  const issueDate = formatDateFacturX(invoice.issue_date);
  const docTypeCode = invoice.document_type === 'invoice' ? '380' :
                     invoice.document_type === 'credit_note' ? '381' :
                     invoice.document_type === 'quote' ? '389' : '380';

  // Due date
  let dueDateEl = '';
  if (invoice.due_date) {
    try {
      const formattedDueDate = formatDateFacturX(invoice.due_date);
      dueDateEl = `
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${formattedDueDate}</udt:DateTimeString>
        </ram:DueDateDateTime>`;
    } catch (e) {
      // Ignorer les erreurs de date d'échéance (non obligatoire)
    }
  }

  // SellerTradeParty - Vendeur
  const sellerName = escapeXml(profile.company_name.trim());
  const sellerSiret = profile.siret?.trim() || '';
  const sellerVat = profile.vat_number?.trim() || '';

  const sellerAddressParts = [
    profile.address?.trim(),
    profile.postal_code?.trim(),
    profile.city?.trim(),
    profile.country?.trim() || 'FR'
  ].filter(Boolean);
  const sellerAddress = sellerAddressParts.length > 0
    ? sellerAddressParts.join(', ')
    : sellerName;

  // BuyerTradeParty - Acheteur
  const buyerName = escapeXml(
    (invoice.client?.name?.trim()) ||
    (invoice.client_name_override?.trim()) ||
    ''
  );

  if (!buyerName) {
    throw new Error('Nom du client manquant');
  }

  // Priorité aux champs directs de l'invoice, sinon utilise les champs du client lié
  const buyerSiret = invoice.client_siret?.trim() || invoice.client?.siret?.trim() || '';
  const buyerVat = invoice.client_vat_number?.trim() || invoice.client?.vat_number?.trim() || '';

  // Priorité aux champs directs de l'invoice, sinon utilise les champs du client lié
  const buyerAddressParts = [
    invoice.client_address?.trim() || invoice.client?.address?.trim(),
    invoice.client_postal_code?.trim() || invoice.client?.postal_code?.trim(),
    invoice.client_city?.trim() || invoice.client?.city?.trim(),
    invoice.client?.country?.trim() || 'FR'
  ].filter(Boolean);
  const buyerAddress = buyerAddressParts.length > 0
    ? buyerAddressParts.join(', ')
    : buyerName;

  // Lignes de facturation avec validation
  const lineItemsXml = invoice.items.map((item, idx) => {
    if (!item.description?.trim()) {
      throw new Error(`Description manquante pour la ligne ${idx + 1}`);
    }

    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unit_price) || 0;
    const vatRate = Number(item.vat_rate) || 0;
    const lineTotal = quantity * unitPrice;

    if (quantity <= 0) {
      throw new Error(`Quantité invalide pour la ligne ${idx + 1}: ${quantity}`);
    }

    if (unitPrice < 0) {
      throw new Error(`Prix unitaire invalide pour la ligne ${idx + 1}: ${unitPrice}`);
    }

    return `
      <ram:IncludedSupplyChainTradeLineItem>
        <ram:AssociatedDocumentLineDocument>
          <ram:LineID>${idx + 1}</ram:LineID>
        </ram:AssociatedDocumentLineDocument>
        <ram:SpecifiedTradeProduct>
          <ram:Name>${escapeXml(item.description.trim())}</ram:Name>
        </ram:SpecifiedTradeProduct>
        <ram:SpecifiedLineTradeAgreement>
          <ram:NetPriceProductTradePrice>
            <ram:ChargeAmount>${formatCurrencyFacturX(unitPrice)}</ram:ChargeAmount>
          </ram:NetPriceProductTradePrice>
        </ram:SpecifiedLineTradeAgreement>
        <ram:SpecifiedLineTradeDelivery>
          <ram:BilledQuantity unitCode="C62">${quantity}</ram:BilledQuantity>
        </ram:SpecifiedLineTradeDelivery>
        <ram:SpecifiedLineTradeSettlement>
          <ram:ApplicableTradeTax>
            <ram:TypeCode>VAT</ram:TypeCode>
            <ram:CategoryCode>${getVatCategoryCode(vatRate)}</ram:CategoryCode>
            <ram:RateApplicablePercent>${vatRate}</ram:RateApplicablePercent>
          </ram:ApplicableTradeTax>
          <ram:SpecifiedTradeSettlementLineMonetarySummation>
            <ram:LineTotalAmount>${formatCurrencyFacturX(lineTotal)}</ram:LineTotalAmount>
          </ram:SpecifiedTradeSettlementLineMonetarySummation>
        </ram:SpecifiedLineTradeSettlement>
      </ram:IncludedSupplyChainTradeLineItem>`;
  }).join('');

  // Calcul des totaux de TVA par taux
  const vatByRate = new Map<number, { taxable: number; tax: number }>();
  invoice.items.forEach(item => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unit_price) || 0;
    const vatRate = Number(item.vat_rate) || 0;

    const taxable = quantity * unitPrice;
    const tax = taxable * (vatRate / 100);

    const current = vatByRate.get(vatRate) || { taxable: 0, tax: 0 };
    vatByRate.set(vatRate, {
      taxable: current.taxable + taxable,
      tax: current.tax + tax
    });
  });

  const vatBreakdownXml = Array.from(vatByRate.entries()).map(([rate, amounts]) => `
        <ram:ApplicableTradeTax>
          <ram:CalculatedAmount>${formatCurrencyFacturX(amounts.tax)}</ram:CalculatedAmount>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:BasisAmount>${formatCurrencyFacturX(amounts.taxable)}</ram:BasisAmount>
          <ram:CategoryCode>${getVatCategoryCode(rate)}</ram:CategoryCode>
          <ram:RateApplicablePercent>${rate}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>`).join('');

  // Calculs des totaux
  const subtotal = Number(invoice.subtotal) || 0;
  const vatAmount = Number(invoice.vat_amount) || 0;
  const total = Number(invoice.total) || 0;

  // Validation des totaux
  if (total < 0) {
    throw new Error('Montant total invalide (négatif)');
  }

  // XML complet Factur-X (Profil EN 16931)
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">

  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#conformant#urn:factur-x.eu:1p0:en16931</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>

  <rsm:ExchangedDocument>
    <ram:ID>${docId}</ram:ID>
    <ram:TypeCode>${docTypeCode}</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${issueDate}</udt:DateTimeString>
    </ram:IssueDateTime>${dueDateEl}
  </rsm:ExchangedDocument>

  <rsm:SupplyChainTradeTransaction>
    ${lineItemsXml}

    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${sellerName}</ram:Name>
        ${sellerSiret ? `<ram:ID schemeID="0002">${escapeXml(sellerSiret)}</ram:ID>` : ''}
        ${sellerVat ? `<ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${escapeXml(sellerVat)}</ram:ID>
        </ram:SpecifiedTaxRegistration>` : ''}
        <ram:PostalTradeAddress>
          <ram:LineOne>${escapeXml(sellerAddress)}</ram:LineOne>
          <ram:CountryID>${escapeXml(profile.country?.trim() || 'FR')}</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:SellerTradeParty>

      <ram:BuyerTradeParty>
        <ram:Name>${buyerName}</ram:Name>
        ${buyerSiret ? `<ram:ID schemeID="0002">${escapeXml(buyerSiret)}</ram:ID>` : ''}
        ${buyerVat ? `<ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${escapeXml(buyerVat)}</ram:ID>
        </ram:SpecifiedTaxRegistration>` : ''}
        <ram:PostalTradeAddress>
          <ram:LineOne>${escapeXml(buyerAddress)}</ram:LineOne>
          <ram:CountryID>${escapeXml(invoice.client?.country?.trim() || 'FR')}</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>

    <ram:ApplicableHeaderTradeDelivery />

    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${escapeXml(currency)}</ram:InvoiceCurrencyCode>${vatBreakdownXml}
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${formatCurrencyFacturX(subtotal)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${formatCurrencyFacturX(subtotal)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${escapeXml(currency)}">${formatCurrencyFacturX(vatAmount)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${formatCurrencyFacturX(total)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${formatCurrencyFacturX(total)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>

  </rsm:SupplyChainTradeTransaction>

</rsm:CrossIndustryInvoice>`;

  return xml;
}

// ── Création du PDF avec XML embarqué ────────────────────────────────────────────

/**
 * Crée un PDF Factur-X à partir d'un buffer PDF existant
 * Embauche le XML Factur-X dans les métadonnées du PDF selon ISO 16684-1
 */
export async function createFacturXPdf(
  pdfBuffer: Uint8Array,
  invoice: Invoice,
  profile: Profile
): Promise<Uint8Array> {
  try {
    // Générer le XML Factur-X
    const facturXXml = generateFacturXXml(invoice, profile);

    // Charger le PDF existant
    const pdfDoc = await PDFDocument.load(pdfBuffer, {
      ignoreEncryption: true,
      updateMetadata: false
    });

    // Encoder le XML en UTF-8
    const xmlBytes = new TextEncoder().encode(facturXXml);

    // Créer le stream pour le fichier XML embarqué
    const xmlStream = pdfDoc.context.flateStream(xmlBytes, {
      Subtype: PDFName.of('text/xml'),
    });

    // Créer le FileSpec pour le fichier XML
    const fileSpecDict = pdfDoc.context.obj({
      Type: PDFName.of('EmbeddedFile'),
      Subtype: PDFName.of('text/xml'),
      F: xmlStream,
      UF: xmlStream,
      EF: pdfDoc.context.obj({
        F: xmlStream,
        UF: xmlStream,
      }),
      Desc: PDFHexString.fromText('Factur-X Invoice Data'),
    });

    const fileSpecRef = pdfDoc.context.register(fileSpecDict);

    // Créer l'array AF (Associated Files)
    const afArray = PDFArray.withContext(pdfDoc.context);
    afArray.push(fileSpecRef);

    // Ajouter AF au catalogue
    const catalog = pdfDoc.catalog;
    catalog.set(PDFName.of('AF'), afArray);

    // Créer les métadonnées XMP pour Factur-X
    const xmpData = createFacturXXmp(invoice.number);
    const xmpStream = pdfDoc.context.flateStream(new TextEncoder().encode(xmpData), {
      Type: PDFName.of('Metadata'),
      Subtype: PDFName.of('XML'),
    });
    const xmpRef = pdfDoc.context.register(xmpStream);
    catalog.set(PDFName.of('Metadata'), xmpRef);

    // Ajouter une collection si elle n'existe pas (pour que le fichier soit visible dans certains lecteurs)
    if (!catalog.get(PDFName.of('Collection'))) {
      const collectionDict = pdfDoc.context.obj({
        D: fileSpecRef,
      });
      catalog.set(PDFName.of('Collection'), collectionDict);
    }

    // Sauvegarder le PDF
    const facturXPdfBytes = await pdfDoc.save({
      useObjectStreams: false,
      addDefaultPage: false,
    });

    return facturXPdfBytes;

  } catch (error) {
    console.error('Erreur lors de la création du PDF Factur-X:', error);
    throw new Error(
      `Échec de la création du PDF Factur-X: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
    );
  }
}

/**
 * Crée les métadonnées XMP pour Factur-X
 */
function createFacturXXmp(invoiceNumber: string): string {
  const now = new Date().toISOString();
  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="FacturmeWeb">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:pdf="http://ns.adobe.com/pdf/1.3/"
    xmlns:pdfx="http://ns.adobe.com/pdfx/1.3/"
    xmlns:fx="http://factur-x.net/1.0/"
   xmp:CreatorTool="FacturmeWeb"
   xmp:CreateDate="${now}"
   pdf:Producer="FacturmeWeb"
   fx:ConformanceLevel="EN 16931"
   fx:DocumentFileName="${invoiceNumber}-facturx.xml"
   fx:DocumentType="INVOICE">
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

/**
 * Valide un fichier XML Factur-X
 */
export function validateFacturXXml(xml: string): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Vérifications basiques de structure
  if (!xml.includes('<?xml')) {
    errors.push('Déclaration XML manquante');
  }

  if (!xml.includes('<rsm:CrossIndustryInvoice')) {
    errors.push('Élément racine CrossIndustryInvoice manquant');
  }

  if (!xml.includes('<ram:ID>')) {
    errors.push('ID de facture manquant');
  } else {
    const idMatch = xml.match(/<ram:ID>([^<]+)<\/ram:ID>/);
    if (idMatch && !idMatch[1].trim()) {
      errors.push('ID de facture vide');
    }
  }

  if (!xml.includes('<ram:IssueDateTime>')) {
    errors.push('Date d\'émission manquante');
  } else {
    const dateMatch = xml.match(/<udt:DateTimeString format="102">(\d{8})<\/udt:DateTimeString>/);
    if (dateMatch) {
      const dateStr = dateMatch[1];
      const year = parseInt(dateStr.slice(0, 4));
      const month = parseInt(dateStr.slice(4, 6));
      const day = parseInt(dateStr.slice(6, 8));

      if (year < 2000 || year > 2100) {
        warnings.push(`Année suspecte: ${year}`);
      }
      if (month < 1 || month > 12) {
        errors.push(`Mois invalide: ${month}`);
      }
      if (day < 1 || day > 31) {
        errors.push(`Jour invalide: ${day}`);
      }
    }
  }

  if (!xml.includes('<ram:SellerTradeParty>')) {
    errors.push('Informations vendeur manquantes');
  } else if (!xml.match(/<ram:Name>[^<]+<\/ram:Name>/)) {
    errors.push('Nom du vendeur manquant');
  }

  if (!xml.includes('<ram:BuyerTradeParty>')) {
    errors.push('Informations acheteur manquantes');
  } else if (!xml.match(/<ram:BuyerTradeParty>[\s\S]*?<ram:Name>[^<]+<\/ram:Name>/)) {
    errors.push('Nom de l\'acheteur manquant');
  }

  if (!xml.includes('<ram:IncludedSupplyChainTradeLineItem>')) {
    errors.push('Aucune ligne de facturation');
  }

  if (!xml.includes('<ram:SpecifiedTradeSettlementHeaderMonetarySummation>')) {
    errors.push('Totaux manquants');
  } else {
    const totalMatch = xml.match(/<ram:GrandTotalAmount>([^<]+)<\/ram:GrandTotalAmount>/);
    if (!totalMatch) {
      errors.push('Montant total manquant');
    } else {
      const total = parseFloat(totalMatch[1]);
      if (isNaN(total) || total < 0) {
        errors.push(`Montant total invalide: ${totalMatch[1]}`);
      }
    }
  }

  // Vérification du profil Factur-X
  if (!xml.includes('urn:cen.eu:en16931:2017')) {
    warnings.push('Profil EN 16931 non explicitement déclaré');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Télécharge un PDF Factur-X pour l'utilisateur
 */
export async function downloadFacturXPdf(
  pdfBuffer: Uint8Array,
  invoice: Invoice,
  profile: Profile
): Promise<void> {
  try {
    // Créer le PDF Factur-X
    const facturXPdfBytes = await createFacturXPdf(pdfBuffer, invoice, profile);

    // Créer un blob et télécharger
    const blob = new Blob([Buffer.from(facturXPdfBytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.number.replace(/\//g, '-')}-facturx.pdf`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    console.error('Erreur lors du téléchargement Factur-X:', error);
    throw new Error(
      `Impossible de télécharger le PDF Factur-X: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
    );
  }
}

// ── Fonctions utilitaires ───────────────────────────────────────────────────────

/**
 * Vérifie si une facture est éligible au format Factur-X
 */
export function isFacturXEligible(
  invoice: Invoice,
  profile: Profile
): { eligible: boolean; reason?: string; warnings?: string[] } {
  const warnings: string[] = [];

  if (!invoice.number?.trim()) {
    return { eligible: false, reason: 'Numéro de facture manquant' };
  }

  if (!invoice.issue_date) {
    return { eligible: false, reason: 'Date d\'émission manquante' };
  }

  if (!invoice.items || invoice.items.length === 0) {
    return { eligible: false, reason: 'Aucune ligne de facturation' };
  }

  if (!profile.company_name?.trim()) {
    return { eligible: false, reason: 'Nom de l\'entreprise manquant' };
  }

  if (!invoice.client?.name?.trim() && !invoice.client_name_override?.trim()) {
    return { eligible: false, reason: 'Nom du client manquant' };
  }

  // Vérifier que les taux de TVA sont valides
  const validVatRates = [0, 2.1, 5.5, 10, 20];
  for (const item of invoice.items) {
    const vatRate = Number(item.vat_rate) || 0;
    if (!validVatRates.includes(vatRate)) {
      warnings.push(`Taux de TVA non standard: ${vatRate}%`);
    }
  }

  // Avertissements si SIRET ou TVA manquants
  if (!profile.siret?.trim()) {
    warnings.push('SIRET du vendeur manquant');
  }

  if (!profile.vat_number?.trim()) {
    warnings.push('Numéro de TVA du vendeur manquant');
  }

  const buyerSiret = invoice.client_siret?.trim() || invoice.client?.siret?.trim();
  if (!buyerSiret) {
    warnings.push('SIRET du client manquant');
  }

  return { eligible: true, warnings };
}

/**
 * Obtient les informations sur la conformité Factur-X
 */
export function getFacturXInfo() {
  return {
    name: 'Factur-X',
    version: '1.0',
    profile: 'EN 16931',
    description: 'Format de facture électronique franco-allemand conforme à la réforme 2026+',
    standard: 'EN 16931 (ZUGFeRD 2.2 / Factur-X 1.0)',
    validatorUrl: 'https://fnfe-mpe.org/factur-x/',
    documentationUrl: 'https://fnfe-mpe.org/factur-x/',
    fnfeMpeUrl: 'https://fnfe-mpe.org/',
    dgfipGuideUrl: 'https://www.economie.gouv.fr/files/files/directions_services/entreprehonne/Facturation_electronique/Guide_pratique_facturation_electronique.pdf',
  };
}

/**
 * Extrait le XML Factur-X d'un PDF (pour validation)
 */
export async function extractFacturXXmlFromPdf(pdfBuffer: Uint8Array): Promise<string | null> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const catalog = pdfDoc.catalog;

    // Chercher le tableau AF (Associated Files)
    const afArray = catalog.get(PDFName.of('AF'));
    if (!afArray) return null;

    // Chercher le fichier XML embarqué
    // @ts-ignore - pdf-lib doesn't expose proper types for PDFArray
    const afArrayLength = afArray.length || 0;
    for (let i = 0; i < afArrayLength; i++) {
      // @ts-ignore
      const item = afArray.get(i);
      if (!item) continue;
      // @ts-ignore
      const ef = item?.get(PDFName.of('EF'));
      if (ef) {
        // @ts-ignore
        const f = ef.get(PDFName.of('F'));
        if (f) {
          const content = await f.decode();
          const xmlString = new TextDecoder().decode(content);
          if (xmlString.includes('<rsm:CrossIndustryInvoice')) {
            return xmlString;
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Erreur extraction XML Factur-X:', error);
    return null;
  }
}
