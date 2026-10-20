-- ==============================================================================
-- Kinetic Craft - RAG Vektordatenbank Schema (Schweizer Handwerk Firmenwissen)
-- ==============================================================================

-- 1. pgvector Extension aktivieren
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Dokumente & Wissen des Handwerksbetriebs (Offerten, Regieberichte, NPK)
CREATE TABLE IF NOT EXISTS firmenwissen (
    id SERIAL PRIMARY KEY,
    titel VARCHAR(255) NOT NULL,
    kategorie VARCHAR(64) NOT NULL, -- z. B. 'offerte', 'npk_katalog', 'stundensaetze', 'regierapport'
    text_inhalt TEXT NOT NULL,
    metadaten JSONB DEFAULT '{}'::jsonb,
    embedding vector(1536), -- Vector-Dimension für Embeddings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Vektor-Index für blitzschnelle Ähnlichkeitssuche (Cosine Distance)
CREATE INDEX IF NOT EXISTS firmenwissen_embedding_idx 
ON firmenwissen 
USING hnsw (embedding vector_cosine_ops);

-- 4. Audit-Log für Schweizer revDSG Konformität
CREATE TABLE IF NOT EXISTS audit_access_logs (
    id SERIAL PRIMARY KEY,
    mandant_id VARCHAR(64) NOT NULL,
    anfrage_typ VARCHAR(64) NOT NULL,
    token_anzahl INTEGER DEFAULT 0,
    zeitstempel TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
