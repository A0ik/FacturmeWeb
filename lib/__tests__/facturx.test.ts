/**
 * Tests automatisés pour Factur-X
 *
 * Teste la génération, la validation et la conformité des fichiers Factur-X
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  generateFacturXXml,
  validateFacturXXml,
  isFacturXEligible,
  getFacturXInfo,
  createFacturXXmp,
} from '../facturx';
import type { Invoice, Profile } from '@/types';

// ── Fixtures de test ───────────────────────────────────────────────────────────

const validProfile: Profile = {
  id: 'test-profile',
  user_id: 'test-user',
  company_name: 'Ma Société Test',
  email: 'test@example.com',
  siret: '12345678900012',
  vat_number: 'FR12345678901',
  address: '123 Rue du Test',
  postal_code: '75001',
  city: 'Paris',
  country: 'FR',
  currency: 'EUR',
  language: 'fr',
  template_id: 1,
  accent_color: '#1D9E75',
  subscription_tier: 'pro',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const validInvoice: Invoice = {
  id: 'test-invoice',
  user_id: 'test-user',
  number: 'FACT-2024-001',
  document_type: 'invoice',
  status: 'sent',
  issue_date: '2024-01-15',
  due_date: '2024-02-15',
  subtotal: 1000,
  vat_amount: 200,
  total: 1200,
  items: [
    {
      id: 'item-1',
      description: 'Prestation de service',
      quantity: 1,
      unit_price: 1000,
      vat_rate: 20,
      total: 1000,
    },
  ],
  client: {
    id: 'client-1',
    name: 'Client Test SARL',
    email: 'client@example.com',
    siret: '98765432100012',
    vat_number: 'FR98765432101',
    address: '456 Avenue Client',
    postal_code: '69001',
    city: 'Lyon',
    country: 'FR',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ── Tests de génération XML ─────────────────────────────────────────────────────

describe('Factur-X - Génération XML', () => {
  it('devrait générer un XML Factur-X valide', () => {
    const xml = generateFacturXXml(validInvoice, validProfile);

    expect(xml).toBeTruthy();
    expect(typeof xml).toBe('string');
    expect(xml.length).toBeGreaterThan(0);
  });

  it('devrait inclure toutes les sections requises', () => {
    const xml = generateFacturXXml(validInvoice, validProfile);

    // Vérifier les éléments racine
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<rsm:CrossIndustryInvoice');
    expect(xml).toContain('</rsm:CrossIndustryInvoice>');

    // Vérifier le contexte
    expect(xml).toContain('<rsm:ExchangedDocumentContext>');
    expect(xml).toContain('urn:cen.eu:en16931:2017');

    // Vérifier le document
    expect(xml).toContain('<rsm:ExchangedDocument>');
    expect(xml).toContain('<ram:ID>FACT-2024-001</ram:ID>');
    expect(xml).toContain('<ram:TypeCode>380</ram:TypeCode>');
    expect(xml).toContain('<ram:IssueDateTime>');
    expect(xml).toContain('<udt:DateTimeString format="102">20240115</udt:DateTimeString>');

    // Vérifier la transaction
    expect(xml).toContain('<rsm:SupplyChainTradeTransaction>');
    expect(xml).toContain('<ram:IncludedSupplyChainTradeLineItem>');

    // Vérifier le vendeur
    expect(xml).toContain('<ram:SellerTradeParty>');
    expect(xml).toContain('<ram:Name>Ma Société Test</ram:Name>');
    expect(xml).toContain('<ram:ID schemeID="0002">12345678900012</ram:ID>');
    expect(xml).toContain('<ram:ID schemeID="VA">FR12345678901</ram:ID>');

    // Vérifier l'acheteur
    expect(xml).toContain('<ram:BuyerTradeParty>');
    expect(xml).toContain('<ram:Name>Client Test SARL</ram:Name>');
    expect(xml).toContain('<ram:ID schemeID="0002">98765432100012</ram:ID>');

    // Vérifier les totaux
    expect(xml).toContain('<ram:SpecifiedTradeSettlementHeaderMonetarySummation>');
    expect(xml).toContain('<ram:LineTotalAmount>1000.00</ram:LineTotalAmount>');
    expect(xml).toContain('<ram:TaxTotalAmount currencyID="EUR">200.00</ram:TaxTotalAmount>');
    expect(xml).toContain('<ram:GrandTotalAmount>1200.00</ram:GrandTotalAmount>');
  });

  it('devrait échouer si le numéro de facture est manquant', () => {
    const invalidInvoice = { ...validInvoice, number: '' };

    expect(() => {
      generateFacturXXml(invalidInvoice, validProfile);
    }).toThrow('Numéro de facture manquant');
  });

  it('devrait échouer si la date d\'émission est manquante', () => {
    const invalidInvoice = { ...validInvoice, issue_date: '' };

    expect(() => {
      generateFacturXXml(invalidInvoice, validProfile);
    }).toThrow('Date d\'émission manquante');
  });

  it('devrait échouer si le nom de l\'entreprise est manquant', () => {
    const invalidProfile = { ...validProfile, company_name: '' };

    expect(() => {
      generateFacturXXml(validInvoice, invalidProfile);
    }).toThrow('Nom de l\'entreprise manquant');
  });

  it('devrait échouer si le nom du client est manquant', () => {
    const invalidInvoice = {
      ...validInvoice,
      client: { ...validInvoice.client, name: '' },
    };

    expect(() => {
      generateFacturXXml(invalidInvoice, validProfile);
    }).toThrow('Nom du client manquant');
  });

  it('devrait gérer correctement les taux de TVA à 0%', () => {
    const invoiceWithZeroVat: Invoice = {
      ...validInvoice,
      items: [
        {
          ...validInvoice.items[0],
          vat_rate: 0,
          total: 1000,
        },
      ],
      subtotal: 1000,
      vat_amount: 0,
      total: 1000,
    };

    const xml = generateFacturXXml(invoiceWithZeroVat, validProfile);

    expect(xml).toContain('<ram:CategoryCode>E</ram:CategoryCode>');
    expect(xml).toContain('<ram:RateApplicablePercent>0</ram:RateApplicablePercent>');
  });

  it('devrait gérer les taux de TVA intermédiaires (10%, 5.5%)', () => {
    const invoiceWithMixedVat: Invoice = {
      ...validInvoice,
      items: [
        {
          id: 'item-1',
          description: 'Service taux réduit',
          quantity: 1,
          unit_price: 500,
          vat_rate: 10,
          total: 500,
        },
        {
          id: 'item-2',
          description: 'Produit très réduit',
          quantity: 1,
          unit_price: 200,
          vat_rate: 5.5,
          total: 200,
        },
      ],
      subtotal: 700,
      vat_amount: 61,
      total: 761,
    };

    const xml = generateFacturXXml(invoiceWithMixedVat, validProfile);

    expect(xml).toContain('<ram:RateApplicablePercent>10</ram:RateApplicablePercent>');
    expect(xml).toContain('<ram:RateApplicablePercent>5.5</ram:RateApplicablePercent>');
  });

  it('devrait échapper correctement les caractères XML spéciaux', () => {
    const invoiceWithSpecialChars: Invoice = {
      ...validInvoice,
      number: 'FACT-2024-<001>',
      client: {
        ...validInvoice.client!,
        name: 'Café & Restaurant "L\'Étoile"',
      },
    };

    const xml = generateFacturXXml(invoiceWithSpecialChars, validProfile);

    // Vérifier que les caractères spéciaux sont échappés
    expect(xml).not.toContain('<');
    expect(xml).toContain('&lt;');
    expect(xml).toContain('&amp;');
    expect(xml).toContain('&quot;');
    expect(xml).toContain('&apos;');
  });
});

// ── Tests de validation XML ─────────────────────────────────────────────────────

describe('Factur-X - Validation XML', () => {
  it('devrait valider un XML Factur-X correct', () => {
    const xml = generateFacturXXml(validInvoice, validProfile);
    const result = validateFacturXXml(xml);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('devrait détecter un XML sans déclaration', () => {
    const invalidXml = '<rsm:CrossIndustryInvoice></rsm:CrossIndustryInvoice>';
    const result = validateFacturXXml(invalidXml);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Déclaration XML manquante');
  });

  it('devrait détecter un XML sans élément racine', () => {
    const invalidXml = '<?xml version="1.0"?><some></some>';
    const result = validateFacturXXml(invalidXml);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Élément racine CrossIndustryInvoice manquant');
  });

  it('devrait détecter un ID de facture manquant', () => {
    const xmlWithMissingId = generateFacturXXml(validInvoice, validProfile)
      .replace(/<ram:ID>FACT-2024-001<\/ram:ID>/, '<ram:ID></ram:ID>');
    const result = validateFacturXXml(xmlWithMissingId);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('ID de facture'))).toBe(true);
  });

  it('devrait valider les dates correctement', () => {
    const xml = generateFacturXXml(validInvoice, validProfile);
    const result = validateFacturXXml(xml);

    expect(result.valid).toBe(true);
    expect(result.warnings).not.toContain('Année suspecte');
  });

  it('devrait détecter une année invalide', () => {
    const xmlWithBadYear = generateFacturXXml(validInvoice, validProfile)
      .replace('20240115', '19990115');
    const result = validateFacturXXml(xmlWithBadYear);

    expect(result.warnings).toContain('Année suspecte: 1999');
  });

  it('devrait détecter un mois invalide', () => {
    const xmlWithBadMonth = generateFacturXXml(validInvoice, validProfile)
      .replace('20240115', '20241315');
    const result = validateFacturXXml(xmlWithBadMonth);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Mois invalide'))).toBe(true);
  });
});

// ── Tests d'éligibilité ─────────────────────────────────────────────────────────

describe('Factur-X - Éligibilité', () => {
  it('devrait considérer une facture complète comme éligible', () => {
    const result = isFacturXEligible(validInvoice, validProfile);

    expect(result.eligible).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('devrait rejeter une facture sans numéro', () => {
    const invoiceWithoutNumber = { ...validInvoice, number: '' };
    const result = isFacturXEligible(invoiceWithoutNumber, validProfile);

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('Numéro de facture manquant');
  });

  it('devrait rejeter une facture sans date d\'émission', () => {
    const invoiceWithoutDate = { ...validInvoice, issue_date: '' };
    const result = isFacturXEligible(invoiceWithoutDate, validProfile);

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('Date d\'émission manquante');
  });

  it('devrait rejeter une facture sans lignes', () => {
    const invoiceWithoutItems = { ...validInvoice, items: [] };
    const result = isFacturXEligible(invoiceWithoutItems, validProfile);

    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('Aucune ligne de facturation');
  });

  it('devrait émettre des avertissements si SIRET ou TVA manquants', () => {
    const profileWithoutInfo = { ...validProfile, siret: '', vat_number: '' };
    const result = isFacturXEligible(validInvoice, profileWithoutInfo);

    expect(result.eligible).toBe(true);
    expect(result.warnings).toContain('SIRET du vendeur manquant');
    expect(result.warnings).toContain('Numéro de TVA du vendeur manquant');
  });

  it('devrait émettre un avertissement pour un taux de TVA non standard', () => {
    const invoiceWithCustomVat: Invoice = {
      ...validInvoice,
      items: [{ ...validInvoice.items[0], vat_rate: 8.5 }],
    };
    const result = isFacturXEligible(invoiceWithCustomVat, validProfile);

    expect(result.eligible).toBe(true);
    expect(result.warnings).toContain('Taux de TVA non standard: 8.5%');
  });
});

// ── Tests métadonnées XMP ───────────────────────────────────────────────────────

describe('Factur-X - Métadonnées XMP', () => {
  it('devrait créer des métadonnées XMP valides', () => {
    const xmp = createFacturXXmp('FACT-2024-001');

    expect(xmp).toBeTruthy();
    expect(xmp).toContain('<?xpacket begin');
    expect(xmp).toContain('</x:xmpmeta>');
    expect(xmp).toContain('<?xpacket end');
  });

  it('devrait inclure les informations Factur-X', () => {
    const xmp = createFacturXXmp('FACT-2024-001');

    expect(xmp).toContain('fx:ConformanceLevel="EN 16931"');
    expect(xmp).toContain('fx:DocumentFileName="FACT-2024-001-facturx.xml"');
    expect(xmp).toContain('fx:DocumentType="INVOICE"');
  });

  it('devrait inclure le créateur et la date', () => {
    const xmp = createFacturXXmp('FACT-2024-001');

    expect(xmp).toContain('xmp:CreatorTool="FacturmeWeb"');
    expect(xmp).toContain('xmp:CreateDate=');
  });
});

// ── Tests des infos Factur-X ─────────────────────────────────────────────────────

describe('Factur-X - Informations', () => {
  it('devrait retourner les informations Factur-X', () => {
    const info = getFacturXInfo();

    expect(info).toMatchObject({
      name: 'Factur-X',
      version: '1.0',
      profile: 'EN 16931',
    });

    expect(info.description).toBeTruthy();
    expect(info.standard).toBeTruthy();
    expect(info.validatorUrl).toContain('http');
    expect(info.documentationUrl).toContain('http');
  });

  it('devrait avoir les URLs corrects', () => {
    const info = getFacturXInfo();

    expect(info.validatorUrl).toContain('fnfe-mpe.org');
    expect(info.documentationUrl).toBe('https://fnfe-mpe.org/factur-x/');
    expect(info.dgfipGuideUrl).toContain('economie.gouv.fr');
  });
});

// ── Tests d'intégration ─────────────────────────────────────────────────────────

describe('Factur-X - Intégration', () => {
  it('devrait générer et valider une facture complète', () => {
    // Génération
    const xml = generateFacturXXml(validInvoice, validProfile);
    expect(xml).toBeTruthy();

    // Validation
    const validation = validateFacturXXml(xml);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);

    // Éligibilité
    const eligibility = isFacturXEligible(validInvoice, validProfile);
    expect(eligibility.eligible).toBe(true);
  });

  it('devrait gérer une facture avec plusieurs lignes', () => {
    const multiLineInvoice: Invoice = {
      ...validInvoice,
      items: [
        {
          id: 'item-1',
          description: 'Prestation 1',
          quantity: 2,
          unit_price: 500,
          vat_rate: 20,
          total: 1000,
        },
        {
          id: 'item-2',
          description: 'Prestation 2',
          quantity: 1,
          unit_price: 300,
          vat_rate: 10,
          total: 300,
        },
        {
          id: 'item-3',
          description: 'Prestation 3',
          quantity: 5,
          unit_price: 50,
          vat_rate: 5.5,
          total: 250,
        },
      ],
      subtotal: 1550,
      vat_amount: 253.75,
      total: 1803.75,
    };

    const xml = generateFacturXXml(multiLineInvoice, validProfile);
    const validation = validateFacturXXml(xml);

    expect(validation.valid).toBe(true);

    // Vérifier que les 3 lignes sont présentes
    expect(xml.split('<ram:IncludedSupplyChainTradeLineItem>').length - 1).toBe(3);
  });

  it('devrait gérer une facture avec remise', () => {
    const invoiceWithDiscount: Invoice = {
      ...validInvoice,
      items: [
        {
          ...validInvoice.items[0],
          unit_price: 800,
          total: 800,
        },
      ],
      subtotal: 800,
      vat_amount: 160,
      discount_percent: 20,
      discount_amount: 160,
      total: 800,
    };

    const xml = generateFacturXXml(invoiceWithDiscount, validProfile);
    const validation = validateFacturXXml(xml);

    expect(validation.valid).toBe(true);
    expect(xml).toContain('800.00'); // Prix avec remise
  });
});
