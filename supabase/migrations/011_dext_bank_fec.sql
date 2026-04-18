CREATE TABLE IF NOT EXISTS bank_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    amount NUMERIC(15,2) NOT NULL,
    transaction_date DATE NOT NULL,
    label TEXT NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    source VARCHAR(50) DEFAULT 'external',
    status VARCHAR(20) DEFAULT 'unreconciled',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own bank transactions"
    ON bank_transactions FOR ALL
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE captured_documents
ADD COLUMN IF NOT EXISTS matched_transaction_id UUID REFERENCES bank_transactions(id) ON DELETE SET NULL;
