-- Table recurring_invoices pour gérer les factures récurrentes automatiques
CREATE TABLE IF NOT EXISTS recurring_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name_override TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  next_run_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  email_config JSONB DEFAULT '{
    "enabled": true,
    "subject": "Votre facture récurrente",
    "message": "Bonjour {{client_name}},\n\nVeuillez trouver ci-joint votre facture récurrente.\n\nCordialement.",
    "send_before_days": 3
  }'::jsonb,
  items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_user_id ON recurring_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_client_id ON recurring_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_next_run_date ON recurring_invoices(next_run_date);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_is_active ON recurring_invoices(is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_frequency ON recurring_invoices(frequency);

-- RLS Policies
ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recurring invoices"
ON recurring_invoices FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recurring invoices"
ON recurring_invoices FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring invoices"
ON recurring_invoices FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring invoices"
ON recurring_invoices FOR DELETE
USING (auth.uid() = user_id);

-- Function pour mettre à jour next_run_date
CREATE OR REPLACE FUNCTION update_next_run_date()
RETURNS TRIGGER AS $$
DECLARE
  next_date TIMESTAMP WITH TIME ZONE;
BEGIN
  CASE NEW.frequency
    WHEN 'weekly' THEN
      next_date := NEW.next_run_date + INTERVAL '7 days';
    WHEN 'monthly' THEN
      next_date := NEW.next_run_date + INTERVAL '1 month';
    WHEN 'quarterly' THEN
      next_date := NEW.next_run_date + INTERVAL '3 months';
    WHEN 'yearly' THEN
      next_date := NEW.next_run_date + INTERVAL '1 year';
    ELSE
      next_date := NEW.next_run_date + INTERVAL '1 month';
  END CASE;

  -- Si next_run_date est dans le passé, calculer à partir de maintenant
  IF NEW.next_run_date < NOW() THEN
    CASE NEW.frequency
      WHEN 'weekly' THEN
        next_date := NOW() + INTERVAL '7 days';
      WHEN 'monthly' THEN
        next_date := NOW() + INTERVAL '1 month';
      WHEN 'quarterly' THEN
        next_date := NOW() + INTERVAL '3 months';
      WHEN 'yearly' THEN
        next_date := NOW() + INTERVAL '1 year';
    END CASE;
  END IF;

  NEW.next_run_date := next_date;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour automatiquement next_run_date
DROP TRIGGER IF EXISTS trigger_update_recurring_next_run_date ON recurring_invoices;
CREATE TRIGGER trigger_update_recurring_next_run_date
BEFORE INSERT OR UPDATE ON recurring_invoices
FOR EACH ROW
EXECUTE FUNCTION update_next_run_date();

-- Commentaires
COMMENT ON TABLE recurring_invoices IS 'Factures récurrentes avec génération automatique';
COMMENT ON COLUMN recurring_invoices.frequency IS 'Fréquence de répétition : weekly, monthly, quarterly, yearly';
COMMENT ON COLUMN recurring_invoices.next_run_date IS 'Date de la prochaine génération de facture';
COMMENT ON COLUMN recurring_invoices.email_config IS 'Configuration de l''email automatique (enabled, subject, message, send_before_days)';
COMMENT ON COLUMN recurring_invoices.items IS 'Articles de la facture récurrente au format JSON';
