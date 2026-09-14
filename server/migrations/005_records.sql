CREATE TABLE IF NOT EXISTS record_folio_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type_id UUID NOT NULL REFERENCES record_types(id) ON DELETE CASCADE,
  prefix TEXT NOT NULL DEFAULT 'RG',
  year INT NOT NULL,
  last_value INT NOT NULL DEFAULT 0,
  UNIQUE (record_type_id, year)
);

CREATE TABLE IF NOT EXISTS records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio TEXT UNIQUE,
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE RESTRICT,
  form_version_id UUID NOT NULL REFERENCES form_versions(id) ON DELETE RESTRICT,
  record_type_id UUID NOT NULL REFERENCES record_types(id) ON DELETE RESTRICT,
  record_type_version_id UUID NOT NULL REFERENCES record_type_versions(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'archived')),
  data JSONB NOT NULL DEFAULT '{}',
  lock_version INT NOT NULL DEFAULT 1,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID NOT NULL REFERENCES users(id),
  finalized_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalized_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_records_form_status ON records (form_id, status);
CREATE INDEX IF NOT EXISTS idx_records_created_by ON records (created_by, status);
CREATE INDEX IF NOT EXISTS idx_records_folio ON records (folio) WHERE folio IS NOT NULL;
