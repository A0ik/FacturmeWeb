export interface Profile {
  id: string;
  email: string;
  company_name: string;
  first_name?: string;
  last_name?: string;
  siret?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country: string;
  phone?: string;
  vat_number?: string;
  logo_url?: string;
  template_id: number;
  accent_color: string;
  legal_status: LegalStatus;
  subscription_tier: SubscriptionTier;
  invoice_count: number;
  monthly_invoice_count: number;
  invoice_month: string;
  invoice_prefix: string;
  currency?: string;
  onboarding_done: boolean;
  custom_template_html?: string;
  stripe_account_id?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  stripe_connect_id?: string;
  signature_url?: string;
  language?: 'fr' | 'en';
  web_push_subscription?: string;
  sector?: string;
  bank_name?: string;
  iban?: string;
  bic?: string;
  payment_terms?: string;
  legal_mention?: string;
  custom_payment_terms?: string;
  trial_start_date?: string;
  trial_end_date?: string;
  is_trial_active?: boolean;
  created_at: string;
}

export type PaymentTermsPreset = 'reception' | 'days15' | 'days30' | 'days45' | 'days60' | 'end_of_month' | 'end_of_month_plus_days' | 'end_of_next_month' | 'custom';

export interface PaymentTerm {
  id: string;
  user_id: string;
  name: string;
  days: number;
  is_default: boolean;
  created_at: string;
}

export type LegalStatus = 'auto-entrepreneur' | 'eirl' | 'eurl' | 'sarl' | 'sas' | 'sasu' | 'sa' | 'autre';
export type SubscriptionTier = 'free' | 'trial' | 'solo' | 'pro' | 'business';

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  siret?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country: string;
  vat_number?: string;
  notes?: string;
  tags?: string[];
  website?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ClientNote {
  id: string;
  client_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface PartialPayment {
  id: string;
  invoice_id: string;
  amount: number;
  paid_at: string;
  method?: string;
  note?: string;
}

export interface WebhookEndpoint {
  id: string;
  user_id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  total: number;
}

export type DocumentType = 'invoice' | 'quote' | 'credit_note' | 'purchase_order' | 'delivery_note' | 'deposit';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'accepted' | 'refused';

export interface Invoice {
  id: string;
  user_id: string;
  client_id?: string;
  client?: Client;
  client_name_override?: string;
  number: string;
  document_type: DocumentType;
  status: InvoiceStatus;
  issue_date: string;
  due_date?: string;
  items: InvoiceItem[];
  subtotal: number;
  vat_amount: number;
  discount_percent?: number | null;
  discount_amount?: number | null;
  total: number;
  notes?: string;
  pdf_url?: string;
  payment_link?: string;
  payment_method?: string;
  stripe_payment_url?: string;
  sumup_checkout_id?: string;
  partial_payments?: PartialPayment[];
  amount_paid?: number;
  voice_transcript?: string;
  linked_invoice_id?: string;
  sent_at?: string;
  paid_at?: string;
  client_signature_url?: string;
  signed_at?: string;
  signed_by?: string;
  signed_ip?: string;
  created_at: string;
  updated_at: string;
  // Détails supplémentaires
  order_reference?: string;
  order_number?: string;
  internal_notes?: string;
  legal_mentions?: string;
  payment_terms_id?: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  client_city?: string;
  client_postal_code?: string;
}

export interface ParsedVoiceInvoice {
  client_name: string | null;
  items: Array<{ description: string; quantity: number; unit_price: number; vat_rate: number }>;
  notes: string | null;
  due_days: number;
}

export interface DashboardStats {
  mrr: number;
  pendingCount: number;
  paidCount: number;
  overdueCount: number;
  totalRevenue: number;
  pendingRevenue: number;
}

export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringInvoice {
  id: string;
  user_id: string;
  client_id?: string;
  client?: Client;
  client_name_override?: string;
  document_type: DocumentType;
  frequency: RecurringFrequency;
  items: InvoiceItem[];
  notes?: string;
  next_run_date: string;
  last_run_date?: string;
  is_active: boolean;
  auto_send: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvoiceFormData {
  document_type?: DocumentType;
  client_id?: string;
  client_name_override?: string;
  issue_date: string;
  due_date?: string;
  items: Omit<InvoiceItem, 'total'>[];
  notes?: string;
  linked_invoice_id?: string;
  discount_percent?: number;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  client_city?: string;
  client_postal_code?: string;
}

export interface Appointment {
  id: string;
  user_id: string;
  client_id?: string;
  client?: Client;
  title: string;
  description?: string;
  location?: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  color: string;
  google_event_id?: string;
  created_at: string;
}

export type CaptureStatus = 'pending' | 'reviewed' | 'published';
export type InvoiceType = 'purchase' | 'sales' | 'expense' | 'receipt';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'cancelled';
export type WorkspaceRole = 'admin' | 'editor' | 'viewer';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
}

export interface CapturedDocument {
  id: string;
  user_id: string;
  client_id?: string;
  workspace_id?: string;
  file_url: string;
  file_type: string;
  status: CaptureStatus;
  ocr_data?: Record<string, any>;
  vendor?: string;
  description?: string;
  amount: number;
  vat_amount: number;
  vat_rate: number;
  document_date?: string;
  due_date?: string;
  category?: string;
  payment_method?: string;
  notes?: string;
  supplier_reference?: string;
  reviewed_at?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
  confidence_score?: number;
  needs_review?: boolean;
  account_code?: string;
  account_name?: string;
  matched_transaction_id?: string;
  // New Dext fields
  line_items?: InvoiceLineItem[];
  invoice_type?: InvoiceType;
  // Payment fields (SEPA)
  supplier_iban?: string;
  supplier_bic?: string;
  supplier_bank_name?: string;
  payment_status?: PaymentStatus;
  payment_due_date?: string;
  sepa_generated?: boolean;
  sepa_file_url?: string;
}

export interface VendorMapping {
  id: string;
  user_id: string;
  vendor_name_pattern: string;
  account_code: string;
  account_name?: string;
  created_at: string;
  updated_at: string;
}

export interface BankTransaction {
  id: string;
  user_id: string;
  workspace_id?: string;
  amount: number;
  transaction_date: string;
  label: string;
  currency: string;
  source: string;
  status: 'unreconciled' | 'reconciled';
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  description?: string;
  logo_url?: string;
  plan: string;
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  email: string;
  role: WorkspaceRole;
  status: 'pending' | 'active' | 'declined' | 'removed';
  invited_by?: string;
  joined_at?: string;
  created_at: string;
}

export interface MerchantConnection {
  id: string;
  user_id: string;
  workspace_id?: string;
  provider: string;
  provider_account_id?: string;
  credentials_encrypted: string;
  credentials_key_id?: string;
  status: 'active' | 'suspended' | 'error' | 'revoked';
  last_sync_at?: string;
  sync_error?: string;
  auto_import: boolean;
  import_settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type MerchantProvider = 'amazon' | 'orange' | 'uber' | 'apple' | 'google' | 'microsoft' | 'other';

export const MERCHANT_PROVIDERS: Record<MerchantProvider, { name: string; icon: string; color: string }> = {
  amazon: { name: 'Amazon Business', icon: '📦', color: 'bg-orange-500' },
  orange: { name: 'Orange Business', icon: '🔶', color: 'bg-orange-400' },
  uber: { name: 'Uber for Business', icon: '🚗', color: 'bg-black' },
  apple: { name: 'Apple Business', icon: '🍎', color: 'bg-gray-800' },
  google: { name: 'Google Workspace', icon: '🔵', color: 'bg-blue-500' },
  microsoft: { name: 'Microsoft 365', icon: '🔷', color: 'bg-blue-600' },
  other: { name: 'Autre fournisseur', icon: '🏢', color: 'bg-gray-500' },
};
