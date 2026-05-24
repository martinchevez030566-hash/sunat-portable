-- =====================================================
-- ESQUEMA SUNAT PORTABLE v1.0
-- Ejecutar en bootstrap inicial. No modificar manualmente.
-- =====================================================

-- TABLA: companies (Empresas)
CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    ruc TEXT NOT NULL UNIQUE,
    address TEXT,
    phone TEXT,
    email TEXT,
    web TEXT,
    footer_text TEXT,
    default_printer TEXT,
    logo_path TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_companies_ruc ON companies(ruc);
CREATE INDEX IF NOT EXISTS idx_companies_active_name ON companies(is_active, name COLLATE NOCASE);

-- TABLA: app_settings (Configuración Global) - CRÍTICA
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO app_settings (key, value) VALUES
    ('active_company_id', NULL),
    ('setup_completed', '0'),
    ('theme', 'light'),
    ('language', 'es'),
    ('last_backup', NULL),
    ('daily_backup_time', '02:00'),
    ('auto_backup_on_close', '1'),
    ('default_page_size', '50'),
    ('schema_version', '1.0');

-- TABLA: documents (Documentos SUNAT)
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    series TEXT NOT NULL,
    number TEXT NOT NULL,
    issue_date DATE NOT NULL,
    supplier_ruc TEXT,
    supplier_name TEXT,
    client_ruc TEXT,
    client_name TEXT,
    subtotal REAL NOT NULL,
    igv REAL NOT NULL,
    total REAL NOT NULL,
    currency TEXT DEFAULT 'PEN',
    status TEXT DEFAULT 'valid',
    parsed_from TEXT NOT NULL,
    xml_hash TEXT,
    content_hash TEXT,
    raw_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    UNIQUE(company_id, type, series, number)
);
CREATE INDEX IF NOT EXISTS idx_documents_company_date ON documents(company_id, issue_date);
CREATE INDEX IF NOT EXISTS idx_documents_company_series_number ON documents(company_id, series, number);
CREATE INDEX IF NOT EXISTS idx_documents_company_client ON documents(company_id, client_name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_documents_company_supplier ON documents(company_id, supplier_ruc);
CREATE INDEX IF NOT EXISTS idx_documents_company_client_ruc ON documents(company_id, client_ruc);
CREATE INDEX IF NOT EXISTS idx_documents_company_type_date ON documents(company_id, type, issue_date DESC);

-- TABLA: document_items (Ítems de Documento)
CREATE TABLE IF NOT EXISTS document_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    line_number INTEGER NOT NULL,
    product_code TEXT,
    description TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT DEFAULT 'NIU',
    unit_price REAL NOT NULL,
    total_line REAL NOT NULL,
    tax_rate REAL DEFAULT 18.0,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    UNIQUE(document_id, line_number)
);
CREATE INDEX IF NOT EXISTS idx_items_document ON document_items(document_id);

-- TABLA: backup_logs (Registro de Backups)
CREATE TABLE IF NOT EXISTS backup_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backup_path TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    size_bytes INTEGER,
    checksum TEXT,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_backups_created ON backup_logs(created_at);

-- TABLA: ingest_logs (Registro de Ingesta)
CREATE TABLE IF NOT EXISTS ingest_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    type TEXT,
    status TEXT,
    error_message TEXT,
    document_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id)
);
CREATE INDEX IF NOT EXISTS idx_ingest_created ON ingest_logs(created_at);