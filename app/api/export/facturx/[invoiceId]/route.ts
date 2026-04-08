import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  // Auth check
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { invoiceId } = await params;
  const admin = createAdminClient();

  // Fetch invoice and profile
  const [{ data: invoice, error: invError }, { data: profile }] = await Promise.all([
    admin
      .from('invoices')
      .select('*, client:clients(*)')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single(),
    admin.from('profiles').select('*').eq('id', user.id).single(),
  ]);

  if (invError || !invoice) {
    return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
  }

  // Format date as YYYYMMDD for Factur-X
  const formatDate = (dateStr: string): string => dateStr.replace(/-/g, '').slice(0, 8);

  const issueDate = formatDate(invoice.issue_date);
  const dueDateEl = invoice.due_date
    ? `<ram:DueDateDateTime>
          <udt:DateTimeString format="102">${formatDate(invoice.due_date)}</udt:DateTimeString>
        </ram:DueDateDateTime>`
    : '';

  const sellerName = profile?.company_name || '';
  const sellerSiret = profile?.siret || '';
  const sellerAddress = [profile?.address, profile?.postal_code, profile?.city]
    .filter(Boolean)
    .join(', ');
  const sellerCountry = profile?.country || 'FR';
  const sellerVat = profile?.vat_number || '';

  const buyerName =
    invoice.client?.name || invoice.client_name_override || '';
  const buyerSiret = invoice.client?.siret || '';
  const buyerAddress = [
    invoice.client?.address,
    invoice.client?.postal_code,
    invoice.client?.city,
  ]
    .filter(Boolean)
    .join(', ');
  const buyerCountry = invoice.client?.country || 'FR';
  const buyerVat = invoice.client?.vat_number || '';

  const currency = profile?.currency || 'EUR';

  const lineItems = (invoice.items || [])
    .map(
      (item: any, idx: number) => `
      <ram:IncludedSupplyChainTradeLineItem>
        <ram:AssociatedDocumentLineDocument>
          <ram:LineID>${idx + 1}</ram:LineID>
        </ram:AssociatedDocumentLineDocument>
        <ram:SpecifiedTradeProduct>
          <ram:Name>${escapeXml(item.description)}</ram:Name>
        </ram:SpecifiedTradeProduct>
        <ram:SpecifiedLineTradeAgreement>
          <ram:NetPriceProductTradePrice>
            <ram:ChargeAmount>${item.unit_price.toFixed(2)}</ram:ChargeAmount>
          </ram:NetPriceProductTradePrice>
        </ram:SpecifiedLineTradeAgreement>
        <ram:SpecifiedLineTradeDelivery>
          <ram:BilledQuantity unitCode="C62">${item.quantity}</ram:BilledQuantity>
        </ram:SpecifiedLineTradeDelivery>
        <ram:SpecifiedLineTradeSettlement>
          <ram:ApplicableTradeTax>
            <ram:TypeCode>VAT</ram:TypeCode>
            <ram:RateApplicablePercent>${item.vat_rate}</ram:RateApplicablePercent>
          </ram:ApplicableTradeTax>
          <ram:SpecifiedTradeSettlementLineMonetarySummation>
            <ram:LineTotalAmount>${item.total.toFixed(2)}</ram:LineTotalAmount>
          </ram:SpecifiedTradeSettlementLineMonetarySummation>
        </ram:SpecifiedLineTradeSettlement>
      </ram:IncludedSupplyChainTradeLineItem>`
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">

  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:factur-x.eu:1p0:minimum</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>

  <rsm:ExchangedDocument>
    <ram:ID>${escapeXml(invoice.number)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${issueDate}</udt:DateTimeString>
    </ram:IssueDateTime>
    ${dueDateEl}
  </rsm:ExchangedDocument>

  <rsm:SupplyChainTradeTransaction>

    ${lineItems}

    <ram:ApplicableHeaderTradeAgreement>

      <ram:SellerTradeParty>
        <ram:Name>${escapeXml(sellerName)}</ram:Name>
        ${sellerSiret ? `<ram:ID schemeID="0002">${escapeXml(sellerSiret)}</ram:ID>` : ''}
        ${sellerVat ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${escapeXml(sellerVat)}</ram:ID></ram:SpecifiedTaxRegistration>` : ''}
        <ram:PostalTradeAddress>
          <ram:LineOne>${escapeXml(sellerAddress)}</ram:LineOne>
          <ram:CountryID>${escapeXml(sellerCountry)}</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:SellerTradeParty>

      <ram:BuyerTradeParty>
        <ram:Name>${escapeXml(buyerName)}</ram:Name>
        ${buyerSiret ? `<ram:ID schemeID="0002">${escapeXml(buyerSiret)}</ram:ID>` : ''}
        ${buyerVat ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${escapeXml(buyerVat)}</ram:ID></ram:SpecifiedTaxRegistration>` : ''}
        <ram:PostalTradeAddress>
          <ram:LineOne>${escapeXml(buyerAddress)}</ram:LineOne>
          <ram:CountryID>${escapeXml(buyerCountry)}</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:BuyerTradeParty>

    </ram:ApplicableHeaderTradeAgreement>

    <ram:ApplicableHeaderTradeDelivery />

    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${escapeXml(currency)}</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${invoice.subtotal.toFixed(2)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${invoice.subtotal.toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${escapeXml(currency)}">${(invoice.vat_amount || 0).toFixed(2)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${invoice.total.toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${invoice.total.toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>

  </rsm:SupplyChainTradeTransaction>

</rsm:CrossIndustryInvoice>`;

  const filename = `${invoice.number.replace(/\//g, '-')}-facturx.xml`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
