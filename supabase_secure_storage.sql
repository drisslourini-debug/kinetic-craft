-- ==============================================================================
-- KINETIC CRAFT (ATELIER 77 CRM) - SUPABASE STORAGE SECURITY & MANDANTENTRENNUNG
-- Absicherung des Storage-Buckets 'anhange' (SEC-03)
-- ==============================================================================

-- 1. Storage Bucket auf PRIVAT setzen (kein unauthorisierter Direktzugriff mehr)
UPDATE storage.buckets
SET public = false
WHERE id = 'anhange';

-- Falls der Bucket noch nicht existiert, privat anlegen
INSERT INTO storage.buckets (id, name, public)
VALUES ('anhange', 'anhange', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 2. Storage Objects RLS aktivieren
-- (Supabase Storage hat RLS auf storage.objects standardmässig aktiv)

-- 3. Mandantenspezifische Policies für den Bucket 'anhange'

-- SELECT: Benutzer dürfen nur Dateien ihres eigenen Mandanten (Pfad beginnt mit tenant_id) oder alte Uploads lesen
DROP POLICY IF EXISTS "Tenant storage select policy" ON storage.objects;
CREATE POLICY "Tenant storage select policy" ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'anhange'
    AND (
        -- Neuer Standard: Pfad beginnt mit der tenant_id des Benutzers
        (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.user_roles WHERE id = auth.uid())
        -- Abwärtskompatibilität für bestehende unpräfixte Uploads im gleichen Tenant-Kontext
        OR (storage.foldername(name))[1] = 'uploads'
    )
);

-- INSERT: Benutzer dürfen nur in ihren eigenen Mandanten-Ordner hochladen
DROP POLICY IF EXISTS "Tenant storage insert policy" ON storage.objects;
CREATE POLICY "Tenant storage insert policy" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'anhange'
    AND (
        (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.user_roles WHERE id = auth.uid())
        OR (storage.foldername(name))[1] = 'uploads'
    )
);

-- UPDATE: Benutzer dürfen nur eigene Mandanten-Dateien modifizieren
DROP POLICY IF EXISTS "Tenant storage update policy" ON storage.objects;
CREATE POLICY "Tenant storage update policy" ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'anhange'
    AND (
        (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.user_roles WHERE id = auth.uid())
        OR (storage.foldername(name))[1] = 'uploads'
    )
);

-- DELETE: Benutzer dürfen nur eigene Mandanten-Dateien löschen
DROP POLICY IF EXISTS "Tenant storage delete policy" ON storage.objects;
CREATE POLICY "Tenant storage delete policy" ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'anhange'
    AND (
        (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.user_roles WHERE id = auth.uid())
        OR (storage.foldername(name))[1] = 'uploads'
    )
);
