CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_owner BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO users (id, email, name, password_hash, is_active, is_owner, created_at, updated_at)
SELECT id, email, name, password_hash, TRUE, TRUE, created_at, created_at
FROM owners
ON CONFLICT (email) DO NOTHING;

ALTER TABLE recovery_codes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
UPDATE recovery_codes SET user_id = owner_id WHERE user_id IS NULL;

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  scope TEXT NOT NULL,
  UNIQUE (role_id, action, scope)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS implementor_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_implementor_grants_user ON implementor_grants (user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users (is_active);

-- Roles del caso piloto M01
INSERT INTO roles (slug, name, description, is_system) VALUES
  ('administrador', 'Administrador', 'Configura el sistema y administra usuarios', TRUE),
  ('supervisor', 'Supervisor', 'Revisa y aprueba lo autorizado', TRUE),
  ('capturista', 'Capturista', 'Captura registros operativos', TRUE),
  ('consulta', 'Consulta', 'Solo lectura', TRUE),
  ('implementador', 'Implementador temporal', 'Herramientas profesionales de implementación', TRUE)
ON CONFLICT (slug) DO NOTHING;

-- Permisos por rol
INSERT INTO role_permissions (role_id, action, scope)
SELECT r.id, p.action, p.scope
FROM roles r
JOIN (VALUES
  ('administrador', 'view', 'all_authorized'),
  ('administrador', 'create', 'all_authorized'),
  ('administrador', 'edit', 'all_authorized'),
  ('administrador', 'archive', 'all_authorized'),
  ('administrador', 'export', 'all_authorized'),
  ('administrador', 'approve', 'all_authorized'),
  ('administrador', 'configure', 'all_authorized'),
  ('administrador', 'audit', 'all_authorized'),
  ('administrador', 'integrations', 'all_authorized'),
  ('supervisor', 'view', 'all_authorized'),
  ('supervisor', 'edit', 'assigned'),
  ('supervisor', 'approve', 'assigned'),
  ('supervisor', 'export', 'assigned'),
  ('capturista', 'view', 'own'),
  ('capturista', 'create', 'own'),
  ('capturista', 'edit', 'own'),
  ('consulta', 'view', 'all_authorized'),
  ('implementador', 'view', 'all_authorized'),
  ('implementador', 'configure', 'type_allowed'),
  ('implementador', 'integrations', 'all_authorized')
) AS p(slug, action, scope) ON r.slug = p.slug
ON CONFLICT DO NOTHING;

-- Propietario existente recibe rol Administrador
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE u.is_owner = TRUE AND r.slug = 'administrador'
ON CONFLICT DO NOTHING;
