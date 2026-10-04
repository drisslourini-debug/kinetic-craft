-- ==============================================================================
-- KINETIC CRAFT (ATELIER 77 CRM) - ATOMARE DOKUMENTEN-NUMMERNKREISE (NUM-01)
-- Lückenlose, kollisionsfreie Nummernvergabe nach MWSTG Art. 26 & GeBüV
-- ==============================================================================

-- 1. Zählertabelle für mandantenspezifische Nummernkreise pro Jahr
CREATE TABLE IF NOT EXISTS public.tenant_document_counters (
    tenant_id UUID NOT NULL,
    doc_type TEXT NOT NULL, -- 'rechnung' oder 'offerte'
    year INT NOT NULL,
    current_number INT NOT NULL DEFAULT 1000,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, doc_type, year)
);

-- RLS für Counters
ALTER TABLE public.tenant_document_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own tenant counters" ON public.tenant_document_counters;
CREATE POLICY "Users can manage own tenant counters" ON public.tenant_document_counters
FOR ALL
TO authenticated
USING (
    tenant_id = (SELECT tenant_id FROM public.user_roles WHERE id = auth.uid())
)
WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.user_roles WHERE id = auth.uid())
);

-- 2. Atomare RPC-Funktion für die nächste Rechnungs- oder Offertennummer
CREATE OR REPLACE FUNCTION public.get_next_document_number(
    p_doc_type TEXT, -- 'rechnung' oder 'offerte'
    p_year INT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_year INT;
    v_next_num INT;
    v_prefix TEXT;
    v_start_num INT;
BEGIN
    -- Ermittle Mandant des aufrufenden Benutzers
    SELECT tenant_id INTO v_tenant_id 
    FROM public.user_roles 
    WHERE id = auth.uid();

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Kein Mandant für den aktuellen Benutzer zugewiesen.';
    END IF;

    v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INT);
    v_prefix := CASE WHEN LOWER(p_doc_type) = 'offerte' THEN 'OF' ELSE 'RE' END;

    -- Standard-Startnummer aus den Einstellungen holen
    IF LOWER(p_doc_type) = 'offerte' THEN
        SELECT COALESCE(startnummer_offerten, 1000) INTO v_start_num 
        FROM public.einstellungen 
        WHERE tenant_id = v_tenant_id LIMIT 1;
    ELSE
        SELECT COALESCE(startnummer_rechnungen, 1000) INTO v_start_num 
        FROM public.einstellungen 
        WHERE tenant_id = v_tenant_id LIMIT 1;
    END IF;
    v_start_num := COALESCE(v_start_num, 1000);

    -- Zeile sperren und atomar hochzählen (FOR UPDATE)
    INSERT INTO public.tenant_document_counters (tenant_id, doc_type, year, current_number)
    VALUES (v_tenant_id, LOWER(p_doc_type), v_year, v_start_num)
    ON CONFLICT (tenant_id, doc_type, year)
    DO UPDATE SET 
        current_number = public.tenant_document_counters.current_number + 1,
        updated_at = NOW()
    RETURNING current_number INTO v_next_num;

    RETURN v_prefix || '-' || v_year || '-' || LPAD(v_next_num::TEXT, 4, '0');
END;
$$;
