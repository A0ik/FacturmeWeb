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
  created_at: string;
}

export type LegalStatus = 'auto-entrepreneur' | 'eirl' | 'eurl' | 'sarl' | 'sas' | 'sasu' | 'sa' | 'autre';
export type SubscriptionTier = 'free' | 'solo' | 'pro';

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
  created_at: string;
  updated_at: string;
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

export interface CapturedDocument {
  id: string;
  user_id: string;
  client_id?: string;
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
}
