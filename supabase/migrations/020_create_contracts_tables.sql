-- Tables pour stocker les contrats de travail (CDD, CDI, Autres)
-- Chaque table est propre à son type de contrat pour optimiser le schéma

-- Table CDI (Contrat à Durée Indéterminée)
CREATE TABLE IF NOT EXISTS public.contracts_cdi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- User & Auth
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Salarié
  employee_first_name TEXT NOT NULL,
  employee_last_name TEXT NOT NULL,
  employee_address TEXT NOT NULL,
  employee_postal_code TEXT NOT NULL,
  employee_city TEXT NOT NULL,
  employee_email TEXT,
  employee_phone TEXT,
  employee_birth_date DATE NOT NULL,
  employee_social_security TEXT,
  employee_nationality TEXT NOT NULL DEFAULT 'Française',
  employee_qualification TEXT,

  -- Contrat
  contract_start_date DATE NOT NULL,
  trial_period_days INTEGER,
  job_title TEXT NOT NULL,
  work_location TEXT NOT NULL,
  work_schedule TEXT NOT NULL DEFAULT '35h hebdomadaires',
  salary_amount NUMERIC NOT NULL,
  salary_frequency TEXT NOT NULL DEFAULT 'monthly',
  contract_classification TEXT,
  working_hours TEXT,

  -- Entreprise
  company_name TEXT NOT NULL,
  company_address TEXT NOT NULL,
  company_postal_code TEXT NOT NULL,
  company_city TEXT NOT NULL,
  company_siret TEXT NOT NULL,
  employer_name TEXT NOT NULL,
  employer_title TEXT NOT NULL DEFAULT 'Gérant',

  -- Avantages
  has_transport BOOLEAN DEFAULT FALSE,
  has_meal BOOLEAN DEFAULT FALSE,
  has_health BOOLEAN DEFAULT FALSE,
  has_other BOOLEAN DEFAULT FALSE,
  other_benefits TEXT,

  -- Clauses spéciales
  collective_agreement TEXT,
  probation_clause BOOLEAN DEFAULT FALSE,
  non_compete_clause BOOLEAN DEFAULT FALSE,
  mobility_clause BOOLEAN DEFAULT FALSE,

  -- Signatures
  employer_signature TEXT, -- Base64 image
  employee_signature TEXT,
  employer_signature_date DATE,
  employee_signature_date DATE,

  -- Document
  document_status TEXT DEFAULT 'draft', -- draft, signed, archived
  contract_html TEXT,

  -- Index pour les performances
  CONSTRAINT contracts_cdi_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security (deferred to migration 022)
-- ALTER TABLE public.contracts_cdi ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS contracts_cdi_user_id_idx ON public.contracts_cdi(user_id);
CREATE INDEX IF NOT EXISTS contracts_cdi_employee_email_idx ON public.contracts_cdi(employee_email);
CREATE INDEX IF NOT EXISTS contracts_cdi_created_at_idx ON public.contracts_cdi(created_at DESC);

-- Table CDD (Contrat à Durée Déterminée)
CREATE TABLE IF NOT EXISTS public.contracts_cdd (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- User & Auth
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Salarié
  employee_first_name TEXT NOT NULL,
  employee_last_name TEXT NOT NULL,
  employee_address TEXT NOT NULL,
  employee_postal_code TEXT NOT NULL,
  employee_city TEXT NOT NULL,
  employee_email TEXT,
  employee_phone TEXT,
  employee_birth_date DATE NOT NULL,
  employee_social_security TEXT,
  employee_nationality TEXT NOT NULL DEFAULT 'Française',

  -- Contrat
  contract_start_date DATE NOT NULL,
  contract_end_date DATE,
  trial_period_days INTEGER,
  job_title TEXT NOT NULL,
  work_location TEXT NOT NULL,
  work_schedule TEXT NOT NULL DEFAULT '35h hebdomadaires',
  salary_amount NUMERIC NOT NULL,
  salary_frequency TEXT NOT NULL DEFAULT 'monthly',
  contract_reason TEXT NOT NULL,
  replaced_employee_name TEXT,

  -- Entreprise
  company_name TEXT NOT NULL,
  company_address TEXT NOT NULL,
  company_postal_code TEXT NOT NULL,
  company_city TEXT NOT NULL,
  company_siret TEXT NOT NULL,
  employer_name TEXT NOT NULL,
  employer_title TEXT NOT NULL DEFAULT 'Gérant',

  -- Avantages
  has_transport BOOLEAN DEFAULT FALSE,
  has_meal BOOLEAN DEFAULT FALSE,
  has_health BOOLEAN DEFAULT FALSE,
  has_other BOOLEAN DEFAULT FALSE,
  other_benefits TEXT,

  -- Signatures
  employer_signature TEXT,
  employee_signature TEXT,
  employer_signature_date DATE,
  employee_signature_date DATE,

  -- Document
  document_status TEXT DEFAULT 'draft',
  contract_html TEXT,

  -- Indexes
  CONSTRAINT contracts_cdd_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS contracts_cdd_user_id_idx ON public.contracts_cdd(user_id);
CREATE INDEX IF NOT EXISTS contracts_cdd_employee_email_idx ON public.contracts_cdd(employee_email);
CREATE INDEX IF NOT EXISTS contracts_cdd_created_at_idx ON public.contracts_cdd(created_at DESC);

-- Table Other (Autres types de contrats)
CREATE TABLE IF NOT EXISTS public.contracts_other (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- User & Auth
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Catégorie
  contract_category TEXT NOT NULL,
  contract_title TEXT,
  duration_weeks TEXT,

  -- Salarié
  employee_first_name TEXT NOT NULL,
  employee_last_name TEXT NOT NULL,
  employee_address TEXT NOT NULL,
  employee_postal_code TEXT NOT NULL,
  employee_city TEXT NOT NULL,
  employee_email TEXT,
  employee_phone TEXT,
  employee_birth_date DATE NOT NULL,
  employee_social_security TEXT,
  employee_nationality TEXT NOT NULL DEFAULT 'Française',

  -- Contrat
  start_date DATE NOT NULL,
  end_date DATE,
  job_title TEXT NOT NULL,
  work_location TEXT NOT NULL,
  work_schedule TEXT NOT NULL DEFAULT '35h hebdomadaires',
  salary_amount NUMERIC NOT NULL,
  salary_frequency TEXT NOT NULL DEFAULT 'monthly',

  -- Entreprise
  company_name TEXT NOT NULL,
  company_address TEXT NOT NULL,
  company_postal_code TEXT NOT NULL,
  company_city TEXT NOT NULL,
  company_siret TEXT NOT NULL,
  employer_name TEXT NOT NULL,
  employer_title TEXT NOT NULL DEFAULT 'Gérant',

  -- Avantages
  has_transport BOOLEAN DEFAULT FALSE,
  has_meal BOOLEAN DEFAULT FALSE,
  has_health BOOLEAN DEFAULT FALSE,
  has_other BOOLEAN DEFAULT FALSE,
  other_benefits TEXT,

  -- Spécifique (Alternance, Stage, etc.)
  tutor_name TEXT,
  school_name TEXT,
  speciality TEXT,
  objectives TEXT,
  tasks TEXT,
  working_hours TEXT DEFAULT '35',
  collective_agreement TEXT,
  statut TEXT DEFAULT 'non_cadre',

  -- Signatures
  employer_signature TEXT,
  employee_signature TEXT,
  employer_signature_date DATE,
  employee_signature_date DATE,

  -- Document
  document_status TEXT DEFAULT 'draft',
  contract_html TEXT,

  -- Indexes
  CONSTRAINT contracts_other_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS contracts_other_user_id_idx ON public.contracts_other(user_id);
CREATE INDEX IF NOT EXISTS contracts_other_employee_email_idx ON public.contracts_other(employee_email);
CREATE INDEX IF NOT EXISTS contracts_other_created_at_idx ON public.contracts_other(created_at DESC);

-- Comments pour documentation
COMMENT ON TABLE public.contracts_cdi IS 'Contrats CDI (Contrat à Durée Indéterminée)';
COMMENT ON TABLE public.contracts_cdd IS 'Contrats CDD (Contrat à Durée Déterminée)';
COMMENT ON TABLE public.contracts_other IS 'Autres types de contrats (Alternance, Stage, etc.)';
