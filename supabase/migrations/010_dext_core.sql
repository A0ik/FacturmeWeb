-- 1. Ajout des colonnes à captured_documents
ALTER TABLE captured_documents
ADD COLUMN IF NOT EXISTS confidence_score INT DEFAULT 100,
ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS account_code TEXT,
ADD COLUMN IF NOT EXISTS account_name TEXT;

-- 2. Création de la table vendor_mappings
CREATE TABLE IF NOT EXISTS vendor_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    vendor_name_pattern TEXT NOT NULL,
    account_code TEXT NOT NULL,
    account_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, vendor_name_pattern)
);

-- RLS sur vendor_mappings
ALTER TABLE vendor_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own vendor mappings"
    ON vendor_mappings
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
