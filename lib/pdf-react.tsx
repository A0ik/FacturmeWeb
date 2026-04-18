/**
 * Helper functions for PDF generation using @react-pdf/renderer
 */

import { pdf } from '@react-pdf/renderer';
import { PdfDocument } from '@/components/pdf-document';
import { Invoice, Profile } from '@/types';

/**
 * Generate a PDF blob from invoice data
 */
export async function generatePdfBlob(invoice: Invoice, profile: Profile): Promise<Blob> {
  const doc = <PdfDocument invoice={invoice} profile={profile} />;
  const pdfDoc = await pdf(doc);
  const blob = await pdfDoc.toBlob();
  return blob;
}

/**
 * Generate a PDF data URL from invoice data (useful for previews)
 */
export async function generatePdfDataUrl(invoice: Invoice, profile: Profile): Promise<string> {
  const doc = <PdfDocument invoice={invoice} profile={profile} />;
  const pdfDoc = await pdf(doc);
  const blob = await pdfDoc.toBlob();
  return URL.createObjectURL(blob);
}

/**
 * Download a PDF file
 */
export async function downloadPdf(invoice: Invoice, profile: Profile, filename?: string): Promise<void> {
  const doc = <PdfDocument invoice={invoice} profile={profile} />;
  const pdfDoc = await pdf(doc);
  const blob = await pdfDoc.toBlob();
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${invoice.number}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Open a PDF in a new tab
 */
export async function openPdfInNewTab(invoice: Invoice, profile: Profile): Promise<void> {
  const doc = <PdfDocument invoice={invoice} profile={profile} />;
  const pdfDoc = await pdf(doc);
  const blob = await pdfDoc.toBlob();
  const url = URL.createObjectURL(blob);

  const win = window.open(url, '_blank');
  if (win) {
    win.onload = () => {
      setTimeout(() => win.print(), 500);
    };
  }

  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/**
 * Get PDF as Uint8Array (useful for server-side storage, API uploads, etc.)
 */
export async function getPdfBytes(invoice: Invoice, profile: Profile): Promise<Uint8Array> {
  const doc = <PdfDocument invoice={invoice} profile={profile} />;
  const pdfDoc = await pdf(doc);
  const blob = await pdfDoc.toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}
