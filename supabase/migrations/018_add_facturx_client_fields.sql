-- Migration: Add Factur-X client fields to invoices
-- Description: Add client_siret and client_vat_number fields to invoices table
-- Required for Factur-X compliance (EN 16931)

-- Add client_siret column
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS client_siret TEXT;

-- Add client_vat_number column
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS client_vat_number TEXT;

-- Add comment for documentation
COMMENT ON COLUMN invoices.client_siret IS 'Client SIRET number (14 digits) - stored when not linked to a client record';
COMMENT ON COLUMN invoices.client_vat_number IS 'Client VAT intracommunity number (format FRXX123456789) - stored when not linked to a client record';

-- Create index for faster queries on these fields
CREATE INDEX IF NOT EXISTS idx_invoices_client_siret ON invoices(client_siret);
CREATE INDEX IF NOT EXISTS idx_invoices_client_vat_number ON invoices(client_vat_number);
