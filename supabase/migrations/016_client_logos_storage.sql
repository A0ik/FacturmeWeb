-- ─── STORAGE BUCKET : client-logos ───────────────────────────────────────────
-- Bucket public pour stocker les logos des clients

INSERT INTO storage.buckets (id, name, public)
VALUES ('client-logos', 'client-logos', true)
ON CONFLICT (id) DO NOTHING;

-- ─── RLS POLICIES ─────────────────────────────────────────────────────────────

-- Lecture publique (pour afficher les logos dans les factures PDF etc.)
CREATE POLICY "Public read client logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-logos');

-- Upload uniquement par l'utilisateur authentifié, dans son propre dossier
CREATE POLICY "Users can upload their client logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'client-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Mise à jour uniquement par le propriétaire du fichier
CREATE POLICY "Users can update their client logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'client-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Suppression uniquement par le propriétaire du fichier
CREATE POLICY "Users can delete their client logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'client-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
