import { Document, Page, Text, View, Image, Font } from '@react-pdf/renderer';
import { Invoice, Profile, InvoiceItem } from '@/types';

// ====================================================================
// ÉTAPE 1 : LA MATRICE DE CONTENU (Les textes qui changent selon le type de document)
// ====================================================================

type DocType = 'facture' | 'devis' | 'avoir' | 'bon_commande' | 'bon_livraison' | 'compte';

interface DocTexts {
  title: string;
  subtitle: string;
  tableTitle: string;
  totalLabel: string;
  legalText: string;
  hasTVA: boolean;
}

const DOCUMENT_TEXTS: Record<DocType, DocTexts> = {
  facture: {
    title: 'FACTURE',
    subtitle: 'Document de facturation standard',
    tableTitle: 'PRESTATION / DESCRIPTION',
    totalLabel: 'TOTAL TTC',
    legalText: 'Paiement sous 30 jours. Indemnité forfaitaire pour frais de recouvrement : 40,00 € (Art. L.441-6 du Code de commerce). Pénalités de retard calculées sur la base de trois fois le taux d\'intérêt légal.',
    hasTVA: true
  },
  devis: {
    title: 'DEVIS',
    subtitle: 'Proposition commerciale',
    tableTitle: 'PRESTATION / DESCRIPTION',
    totalLabel: 'TOTAL HT',
    legalText: 'Ce devis est valable 1 mois à compter de la date d\'émission. En cas d\'acceptation de ce devis par le client, il vaut contrat. TVA non applicable sur les devis.',
    hasTVA: false
  },
  avoir: {
    title: 'AVOIR',
    subtitle: 'Note de crédit / Remboursement',
    tableTitle: 'DÉTAIL DES AVOIRS',
    totalLabel: 'TOTAL TTC AVOIR',
    legalText: 'Cet avoir annule et remplace la facture de référence. Il entraîne soit un remboursement, soit une compensation sur une prochaine facture.',
    hasTVA: true
  },
  bon_commande: {
    title: 'BON DE COMMANDE',
    subtitle: 'Confirmation de votre commande',
    tableTitle: 'ARTICLES COMMANDÉS',
    totalLabel: 'TOTAL HT',
    legalText: 'Nous vous remercions de votre commande. Le contrat s\'appliquera dès réception de ce bon de commande. Aucune TVA applicable sur les bons de commande.',
    hasTVA: false
  },
  bon_livraison: {
    title: 'BON DE LIVRAISON',
    subtitle: 'Accusé de réception des marchandises',
    tableTitle: 'MARCHANDISES LIVRÉES',
    totalLabel: 'QUANTITÉ LIVRÉE',
    legalText: 'Le destinataire dispose d\'un délai de 3 jours ouvrables à compter de la réception pour signaler tout dommage ou manquant. En cas de litige, tribunal compétent du siège du vendeur.',
    hasTVA: false
  },
  compte: {
    title: 'ACOMPTE',
    subtitle: 'Reçu de paiement / Acompte',
    tableTitle: 'DÉTAIL DE L\'ACOMPTE',
    totalLabel: 'MONTANT TOTAL',
    legalText: 'Le solde restant dû sera exigible à la réception de la facture finale. Le paiement de cet acompte confirme l\'acceptation des conditions générales de vente.',
    hasTVA: false
  }
};

// ====================================================================
// ÉTAPE 2 : LA MATRICE DE STYLE (L'apparence visuelle selon le template)
// ====================================================================

type TemplateId = 'minimaliste' | 'classique' | 'moderne' | 'élégant' | 'corporate' | 'nature';

interface TemplateStyle {
  fontFamily: string;
  primaryColor: string;
  titleSize: string;
  titleWeight: number;
  headerAlign: 'left' | 'center';
  tableBorder: string;
  textPadding: string;
  totalTextSize: string;
}

const TEMPLATE_STYLES: Record<TemplateId, TemplateStyle> = {
  minimaliste: {
    fontFamily: 'Inter, sans-serif',
    primaryColor: '#000000',
    titleSize: '24px',
    titleWeight: 800,
    headerAlign: 'left',
    tableBorder: 'none',
    textPadding: '15px 0',
    totalTextSize: '22px'
  },
  classique: {
    fontFamily: 'Georgia, serif',
    primaryColor: '#1f2937',
    titleSize: '28px',
    titleWeight: 700,
    headerAlign: 'center',
    tableBorder: '1px solid #e5e7eb',
    textPadding: '20px 0',
    totalTextSize: '26px'
  },
  moderne: {
    fontFamily: 'Inter, sans-serif',
    primaryColor: '#2563EB',
    titleSize: '24px',
    titleWeight: 800,
    headerAlign: 'left',
    tableBorder: '1px solid #E5E7EB',
    textPadding: '20px 0',
    totalTextSize: '24px'
  },
  élégant: {
    fontFamily: 'Playfair Display, serif',
    primaryColor: '#1F2937',
    titleSize: '26px',
    titleWeight: 700,
    headerAlign: 'center',
    tableBorder: 'none',
    textPadding: '20px 0',
    totalTextSize: '24px'
  },
  corporate: {
    fontFamily: 'Arial, sans-serif',
    primaryColor: '#1E3A5F',
    titleSize: '22px',
    titleWeight: 900,
    headerAlign: 'left',
    tableBorder: '2px solid #1E3A5F',
    textPadding: '20px 0',
    totalTextSize: '22px'
  },
  nature: {
    fontFamily: 'Verdana, sans-serif',
    primaryColor: '#166534',
    titleSize: '24px',
    titleWeight: 700,
    headerAlign: 'center',
    tableBorder: '1px dashed #166534',
    textPadding: '20px 0',
    totalTextSize: '24px'
  }
};

// ====================================================================
// UTILITAIRES
// ====================================================================

function formatCurrency(amount: number, currency = 'EUR', locale = 'fr-FR'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount ?? 0);
}

function formatDate(dateString: string, locale = 'fr-FR'): string {
  try {
    const d = new Date(dateString);
    const isFrench = locale.startsWith('fr');
    const months = isFrench
      ? ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return String(dateString);
  }
}

function truncateText(text: string, maxWidth: number = 250): string {
  if (!text) return '';
  if (text.length <= maxWidth) return text;
  return text.substring(0, maxWidth - 3) + '...';
}

function mapDocumentType(documentType: string): DocType {
  const mapping: Record<string, DocType> = {
    'invoice': 'facture',
    'quote': 'devis',
    'credit_note': 'avoir',
    'purchase_order': 'bon_commande',
    'delivery_note': 'bon_livraison',
    'deposit': 'compte'
  };
  return mapping[documentType] || 'facture';
}

function mapTemplateId(templateId: number): TemplateId {
  const mapping: Record<number, TemplateId> = {
    1: 'minimaliste',
    2: 'classique',
    3: 'moderne',
    4: 'élégant',
    5: 'corporate',
    6: 'nature'
  };
  return mapping[templateId] || 'minimaliste';
}

// ====================================================================
// COMPOSANT DE PAGE PDF
// ====================================================================

interface PdfPageProps {
  invoice: Invoice;
  profile: Profile;
  docType: DocType;
  templateStyle: TemplateStyle;
  docTexts: DocTexts;
}

function PdfPage({ invoice, profile, docType, templateStyle, docTexts }: PdfPageProps) {
  const currency = profile.currency || 'EUR';
  const locale = profile.language === 'en' ? 'en-GB' : 'fr-FR';
  const isFrench = locale.startsWith('fr');
  const client = invoice.client;
  const clientName = client?.name || invoice.client_name_override || 'Client';
  const clientAddress = client ? [
    client.address,
    `${client.postal_code || ''} ${client.city || ''}`.trim(),
    client.country !== 'France' ? client.country : ''
  ].filter(Boolean).join(', ') : '';

  const senderName = profile.company_name || 'Mon Entreprise';
  const senderAddress = [
    profile.address,
    `${profile.postal_code || ''} ${profile.city || ''}`.trim(),
    profile.country
  ].filter(Boolean).join(', ');

  const showTvaColumn = docTexts.hasTVA;
  const isDevis = docType === 'devis';

  return (
    <Page size="A4" style={{ fontFamily: templateStyle.fontFamily, padding: '40px' }}>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* ── EN-TÊTE ───────────────────────────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}

      <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: '30px' }}>

        {/* Logo et Émetteur */}
        <View style={{ flex: 1 }}>
          {profile.logo_url && (
            <Image
              src={profile.logo_url}
              style={{ width: '150px', height: '60px', objectFit: 'contain', marginBottom: '10px' }}
            />
          )}
          <Text style={{ fontSize: templateStyle.titleSize, fontWeight: templateStyle.titleWeight, color: templateStyle.primaryColor }}>
            {senderName}
          </Text>
          <Text style={{ fontSize: '11px', color: '#6b7280', marginTop: '5px' }}>
            {senderAddress}
          </Text>
          {profile.phone && (
            <Text style={{ fontSize: '11px', color: '#6b7280' }}>
              {profile.phone}
            </Text>
          )}
          {profile.email && (
            <Text style={{ fontSize: '11px', color: '#6b7280' }}>
              {profile.email}
            </Text>
          )}
        </View>

        {/* Titre et Infos Document */}
        <View style={{
          flex: 1,
          alignItems: templateStyle.headerAlign === 'center' ? 'center' : 'flex-end',
          marginTop: '10px'
        }}>
          <Text style={{ fontSize: templateStyle.titleSize, fontWeight: templateStyle.titleWeight, color: templateStyle.primaryColor }}>
            {docTexts.title}
          </Text>
          <Text style={{ fontSize: '11px', color: '#6b7280', marginTop: '5px' }}>
            {docTexts.subtitle}
          </Text>
          <Text style={{ fontSize: '10px', color: '#6b7280', marginTop: '10px' }}>
            {isFrench ? 'Émis le' : 'Issued on'} {formatDate(invoice.issue_date, locale)}
          </Text>
          {invoice.due_date && (
            <Text style={{ fontSize: '10px', color: '#6b7280', marginTop: '5px' }}>
              {isFrench ? 'Échéance' : 'Due date'}: {formatDate(invoice.due_date, locale)}
            </Text>
          )}
        </View>
      </View>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* ── INFO CLIENT ───────────────────────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}

      <View style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: templateStyle.headerAlign === 'center' ? 'center' : 'flex-end',
        marginBottom: '30px',
        padding: '15px',
        backgroundColor: '#f9fafb',
        borderLeftWidth: '3px',
        borderLeftColor: templateStyle.primaryColor,
        borderRadius: '5px'
      }}>
        <View>
          <Text style={{ fontSize: '8px', fontWeight: 'bold', color: templateStyle.primaryColor, textTransform: 'uppercase', marginBottom: '5px' }}>
            {isFrench ? 'FACTURÉ À' : 'BILLED TO'}
          </Text>
          <Text style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>
            {clientName}
          </Text>
          <Text style={{ fontSize: '10px', color: '#6b7280', marginBottom: '3px' }}>
            {clientAddress || (isFrench ? 'Adresse non renseignée' : 'Address not provided')}
          </Text>
          {client?.email && (
            <Text style={{ fontSize: '10px', color: '#6b7280', marginBottom: '3px' }}>
              {client.email}
            </Text>
          )}
          {client?.phone && (
            <Text style={{ fontSize: '10px', color: '#6b7280', marginBottom: '3px' }}>
              {client.phone}
            </Text>
          )}
          {client?.siret && (
            <Text style={{ fontSize: '9px', color: '#9ca3af' }}>
              SIRET: {client.siret}
            </Text>
          )}
        </View>
      </View>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* ── TABLEAU DES LIGNES ─────────────────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}

      <View style={{ marginBottom: '20px' }}>
        {/* En-tête du tableau */}
        <View style={{
          display: 'flex',
          flexDirection: 'row',
          borderBottom: templateStyle.tableBorder === 'none' ? '1px solid #000000' : templateStyle.tableBorder,
          paddingBottom: '8px',
          marginBottom: '10px'
        }}>
          <Text style={{ flex: showTvaColumn ? 4 : 5, fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>
            {docTexts.tableTitle}
          </Text>
          <Text style={{ flex: 1, fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center' }}>
            {isFrench ? 'QTE' : 'QTY'}
          </Text>
          <Text style={{ flex: 1, fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'right' }}>
            {isFrench ? 'P.U. HT' : 'UNIT PRICE'}
          </Text>
          {showTvaColumn && (
            <Text style={{ flex: 1, fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center' }}>
              TVA
            </Text>
          )}
          <Text style={{ flex: 1, fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'right' }}>
            {isFrench ? 'TOTAL HT' : 'TOTAL'}
          </Text>
        </View>

        {/* Lignes du tableau */}
        {invoice.items.map((item: InvoiceItem, index: number) => (
          <View key={item.id || index} style={{
            display: 'flex',
            flexDirection: 'row',
            padding: templateStyle.textPadding,
            backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb',
            borderBottom: '1px solid #f3f4f6'
          }}>
            <View style={{ flex: showTvaColumn ? 4 : 5, paddingRight: '10px' }}>
              <Text style={{ fontSize: '10px' }}>
                {truncateText(item.description, 50)}
              </Text>
            </View>
            <Text style={{ flex: 1, fontSize: '10px', textAlign: 'center', color: '#6b7280' }}>
              {item.quantity ?? 1}
            </Text>
            <Text style={{ flex: 1, fontSize: '10px', textAlign: 'right', color: '#6b7280' }}>
              {formatCurrency(item.unit_price ?? 0, currency, locale)}
            </Text>
            {showTvaColumn && (
              <Text style={{ flex: 1, fontSize: '10px', textAlign: 'center', color: '#6b7280' }}>
                {item.vat_rate ?? 0}%
              </Text>
            )}
            <Text style={{ flex: 1, fontSize: '10px', textAlign: 'right', fontWeight: 'bold' }}>
              {formatCurrency(item.total ?? (item.quantity ?? 1) * (item.unit_price ?? 0), currency, locale)}
            </Text>
          </View>
        ))}
      </View>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* ── CONDITIONS SPÉCIFIQUES POUR DEVIS ───────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}

      {isDevis && (
        <View style={{
          marginBottom: '15px',
          paddingBottom: '15px',
          borderBottom: '1px dashed #000000'
        }}>
          <Text style={{ fontSize: '9px', fontStyle: 'italic', color: '#374151', marginTop: '15px' }}>
            {docTexts.legalText}
          </Text>
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* ── BLOC TOTAL ────────────────────────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}

      <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end', marginBottom: '30px' }}>
        <View style={{ width: '250px' }}>

          {/* Sous-total HT */}
          <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: '8px' }}>
            <Text style={{ fontSize: '11px', color: '#6b7280' }}>
              {isFrench ? 'Sous-total HT' : 'Subtotal'}
            </Text>
            <Text style={{ fontSize: '11px', fontWeight: 'bold' }}>
              {formatCurrency(invoice.subtotal ?? 0, currency, locale)}
            </Text>
          </View>

          {/* TVA (si applicable) */}
          {docTexts.hasTVA && (
            <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: '8px' }}>
              <Text style={{ fontSize: '11px', color: '#6b7280' }}>
                TVA
              </Text>
              <Text style={{ fontSize: '11px', fontWeight: 'bold' }}>
                {formatCurrency(invoice.vat_amount ?? 0, currency, locale)}
              </Text>
            </View>
          )}

          {/* Remise (si applicable) */}
          {(invoice.discount_amount ?? 0) > 0 && (
            <View style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginBottom: '8px' }}>
              <Text style={{ fontSize: '11px', color: '#ef4444' }}>
                {isFrench ? `Remise (${invoice.discount_percent ?? 0}%)` : `Discount (${invoice.discount_percent ?? 0}%)`}
              </Text>
              <Text style={{ fontSize: '11px', fontWeight: 'bold', color: '#ef4444' }}>
                -{formatCurrency(invoice.discount_amount ?? 0, currency, locale)}
              </Text>
            </View>
          )}

          {/* Ligne de séparation */}
          <View style={{ height: '1px', backgroundColor: '#e5e7eb', marginVertical: '10px' }} />

          {/* Total */}
          <View style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: '20px',
            borderTop: '3px solid #000000',
            marginTop: '30px'
          }}>
            <Text style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              {docTexts.totalLabel}
            </Text>
            <Text style={{
              fontSize: templateStyle.totalTextSize,
              fontWeight: 'bold',
              color: templateStyle.primaryColor
            }}>
              {formatCurrency(invoice.total ?? 0, currency, locale)}
            </Text>
          </View>
        </View>
      </View>

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* ── NOTES (si présentes) ───────────────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}

      {invoice.notes && (
        <View style={{
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: '#f9fafb',
          borderLeftWidth: '3px',
          borderLeftColor: templateStyle.primaryColor,
          borderRadius: '5px'
        }}>
          <Text style={{ fontSize: '9px', fontWeight: 'bold', color: templateStyle.primaryColor, textTransform: 'uppercase', marginBottom: '5px' }}>
            {isFrench ? 'Notes' : 'Notes'}
          </Text>
          <Text style={{ fontSize: '10px', color: '#374151', lineHeight: '1.5' }}>
            {invoice.notes}
          </Text>
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* ── LIEN DE PAIEMENT (si présent) ──────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}

      {(invoice.stripe_payment_url || invoice.payment_link) && (
        <View style={{
          marginBottom: '20px',
          padding: '20px',
          backgroundColor: `${templateStyle.primaryColor}10`,
          border: `1px solid ${templateStyle.primaryColor}30`,
          borderRadius: '10px',
          textAlign: 'center'
        }}>
          <Text style={{ fontSize: '9px', fontWeight: 'bold', color: templateStyle.primaryColor, textTransform: 'uppercase', marginBottom: '10px' }}>
            {isFrench ? 'PAIEMENT EN LIGNE' : 'ONLINE PAYMENT'}
          </Text>
          <Text style={{ fontSize: '12px', fontWeight: 'bold', color: templateStyle.primaryColor, marginBottom: '5px' }}>
            {isFrench ? `Payer ${formatCurrency(invoice.total ?? 0, currency, locale)} en ligne` : `Pay ${formatCurrency(invoice.total ?? 0, currency, locale)} online`}
          </Text>
          <Text style={{ fontSize: '8px', color: '#6b7280', marginTop: '5px' }}>
            {invoice.stripe_payment_url || invoice.payment_link}
          </Text>
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* ── INFOS BANCAIRES (pour factures et acomptes) ─────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}

      {(docType === 'facture' || docType === 'compte') && (profile.iban || profile.bank_name) && (
        <View style={{
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: '#f9fafb',
          borderLeftWidth: '3px',
          borderLeftColor: templateStyle.primaryColor,
          borderRadius: '5px'
        }}>
          <Text style={{ fontSize: '9px', fontWeight: 'bold', color: templateStyle.primaryColor, textTransform: 'uppercase', marginBottom: '8px' }}>
            {isFrench ? 'COORDONNÉES BANCAIRES' : 'BANK DETAILS'}
          </Text>
          {profile.bank_name && (
            <Text style={{ fontSize: '10px', marginBottom: '3px' }}>
              <Text style={{ fontWeight: 'bold' }}>{isFrench ? 'Banque' : 'Bank'}:</Text> {profile.bank_name}
            </Text>
          )}
          {profile.iban && (
            <Text style={{ fontSize: '10px', marginBottom: '3px' }}>
              <Text style={{ fontWeight: 'bold' }}>IBAN:</Text> {profile.iban}
            </Text>
          )}
          {profile.bic && (
            <Text style={{ fontSize: '10px' }}>
              <Text style={{ fontWeight: 'bold' }}>BIC:</Text> {profile.bic}
            </Text>
          )}
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* ── FOOTER (texte légal) ───────────────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}

      {!isDevis && (
        <View style={{
          marginTop: 'auto',
          paddingTop: '20px',
          borderTop: '1px solid #d1d5db'
        }}>
          <Text style={{ fontSize: '8px', color: '#6b7280', lineHeight: '1.4' }}>
            {docTexts.legalText}
          </Text>

          {/* Mentions légales additionnelles */}
          <View style={{ marginTop: '10px' }}>
            {profile.siret && (
              <Text style={{ fontSize: '8px', color: '#9ca3af' }}>
                SIRET: {profile.siret}
              </Text>
            )}
            {profile.vat_number && (
              <Text style={{ fontSize: '8px', color: '#9ca3af' }}>
                N° TVA: {profile.vat_number}
              </Text>
            )}
            {profile.legal_status === 'auto-entrepreneur' && (
              <Text style={{ fontSize: '8px', color: '#9ca3af' }}>
                {isFrench
                  ? "Dispensé d'immatriculation au RCS et au RM - TVA non applicable, art. 293 B du CGI"
                  : 'Exempt from RCS and RM registration - VAT not applicable, art. 293 B of CGI'
                }
              </Text>
            )}
          </View>

          {/* Numéro de document */}
          <View style={{ marginTop: '15px', textAlign: 'center' }}>
            <Text style={{ fontSize: '14px', fontWeight: 'bold', color: templateStyle.primaryColor }}>
              {invoice.number}
            </Text>
          </View>
        </View>
      )}

    </Page>
  );
}

// ====================================================================
// COMPOSANT RACINE DU DOCUMENT PDF
// ====================================================================

interface PdfDocumentProps {
  invoice: Invoice;
  profile: Profile;
}

export function PdfDocument({ invoice, profile }: PdfDocumentProps) {
  const docType = mapDocumentType(invoice.document_type);
  const templateId = mapTemplateId(profile.template_id || 1);

  const docTexts = DOCUMENT_TEXTS[docType];
  const templateStyle = TEMPLATE_STYLES[templateId];

  return (
    <Document>
      <PdfPage
        invoice={invoice}
        profile={profile}
        docType={docType}
        templateStyle={templateStyle}
        docTexts={docTexts}
      />
    </Document>
  );
}

export { DOCUMENT_TEXTS, TEMPLATE_STYLES, type DocType, type TemplateId };
