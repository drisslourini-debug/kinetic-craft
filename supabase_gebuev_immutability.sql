-- ==============================================================================
-- KINETIC CRAFT (ATELIER 77 CRM) - GEBÜV REVISIONS- & UNVERÄNDERBARKEITS-TRIGGER
-- Einhaltung der Schweizer Geschäftsbücherverordnung (GeBüV) & MWSTG Art. 26
-- ==============================================================================

-- 1. Trigger-Funktion: Unveränderbarkeit von finalisierten Rechnungen
CREATE OR REPLACE FUNCTION public.check_rechnung_immutability()
RETURNS trigger AS $$
BEGIN
    -- 1. Status 'Bezahlt' oder 'Storniert': Strikte Unveränderbarkeit
    IF OLD.status IN ('Bezahlt', 'Storniert') THEN
        -- Status darf von 'Bezahlt' nur zu 'Storniert' wechseln, niemals zurück zu 'Entwurf' oder 'Versendet'
        IF OLD.status = 'Bezahlt' AND NEW.status NOT IN ('Bezahlt', 'Storniert') THEN
            RAISE EXCEPTION 'GeBüV-Verletzung: Eine bezahlte Rechnung darf nicht in den Entwurf- oder Offen-Status zurückgesetzt werden (ID: %).', OLD.id;
        END IF;

        -- Status 'Storniert' ist endgültig
        IF OLD.status = 'Storniert' AND NEW.status != 'Storniert' THEN
            RAISE EXCEPTION 'GeBüV-Verletzung: Eine stornierte Rechnung kann nicht reaktiviert werden (ID: %).', OLD.id;
        END IF;

        -- Positionen (daten), Beträge (total) und Rechnungsnummer (rechnung_nr) sind unveränderlich
        IF (OLD.daten IS DISTINCT FROM NEW.daten) OR 
           (OLD.total IS DISTINCT FROM NEW.total) OR 
           (OLD.rechnung_nr IS DISTINCT FROM NEW.rechnung_nr) OR
           (OLD.rechnungsdatum IS DISTINCT FROM NEW.rechnungsdatum) THEN
            RAISE EXCEPTION 'GeBüV-Verletzung: Positionen, Beträge und Datum einer bezahlten/stornierten Rechnung sind unveränderlich (ID: %).', OLD.id;
        END IF;
    END IF;

    -- 2. Status 'Versendet' oder 'Überfällig': Direkte Inhaltsänderungen verboten
    IF OLD.status IN ('Versendet', 'Überfällig') THEN
        IF (OLD.daten IS DISTINCT FROM NEW.daten) OR (OLD.total IS DISTINCT FROM NEW.total) THEN
            RAISE EXCEPTION 'GeBüV-Verletzung: Eine bereits versendete Rechnung darf nicht direkt verändert werden. Bitte stornieren Sie diese Rechnung oder erstellen Sie einen Korrekturbeleg (ID: %).', OLD.id;
        END IF;
    END IF;

    -- 3. Schutz vor Löschung der Rechnungsnummer
    IF OLD.rechnung_nr IS NOT NULL AND NEW.rechnung_nr IS NULL THEN
        RAISE EXCEPTION 'Rechtliche Vorgabe: Eine vergebene Rechnungsnummer darf nicht entfernt werden.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger an Tabelle rechnungen binden
DROP TRIGGER IF EXISTS trg_rechnung_immutability ON public.rechnungen;
CREATE TRIGGER trg_rechnung_immutability
BEFORE UPDATE ON public.rechnungen
FOR EACH ROW
EXECUTE FUNCTION public.check_rechnung_immutability();

-- 3. Schutz vor physischem Löschen von finalisierten Rechnungen (DELETE)
CREATE OR REPLACE FUNCTION public.check_rechnung_delete_restriction()
RETURNS trigger AS $$
BEGIN
    IF OLD.status != 'Entwurf' THEN
        RAISE EXCEPTION 'GeBüV-Verletzung: Nur Rechnungs-Entwürfe dürfen physisch gelöscht werden. Finalisierte Rechnungen müssen storniert oder archiviert werden (ID: %, Nr: %).', OLD.id, OLD.rechnung_nr;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rechnung_delete_restriction ON public.rechnungen;
CREATE TRIGGER trg_rechnung_delete_restriction
BEFORE DELETE ON public.rechnungen
FOR EACH ROW
EXECUTE FUNCTION public.check_rechnung_delete_restriction();
