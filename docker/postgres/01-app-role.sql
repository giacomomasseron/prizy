-- Creates a limited-privilege application role so that PostgreSQL Row-Level
-- Security policies apply to the app connection.
--
-- The POSTGRES_USER ('prizy') is a superuser by design; superusers bypass
-- RLS unconditionally, even with FORCE ROW LEVEL SECURITY.  The app must
-- connect as a *non*-superuser ('prizy_app') so the workspace-isolation
-- RLS policies actually filter rows.
--
-- Privileges needed by prizy_app:
--   • CONNECT + ALL PRIVILEGES on both 'prizy' and 'prizy_test' databases
--   • CREATE, USAGE on the public schema in each database  (migrations create
--     tables as prizy_app, so prizy_app owns those objects — FORCE ROW LEVEL
--     SECURITY therefore enforces on them)
--
-- The ALTER DEFAULT PRIVILEGES lines below cover any superuser-owned objects
-- that might be created in the public schema.  They are not load-bearing for
-- the current setup (prizy_app runs the migrations and owns its objects), but
-- are left as a safety net.
--
-- This script runs once on a FRESH volume via /docker-entrypoint-initdb.d,
-- connected to POSTGRES_DB ('prizy') as the superuser ('prizy').

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'prizy_app') THEN
        CREATE ROLE prizy_app WITH LOGIN PASSWORD 'secret';
    END IF;
END
$$;

-- ── prizy (dev database) ─────────────────────────────────────────────────────

-- Database-level privileges
GRANT CONNECT ON DATABASE prizy TO prizy_app;
GRANT ALL PRIVILEGES ON DATABASE prizy TO prizy_app;

-- Schema-level privileges (required for CREATE TABLE in migrations)
GRANT ALL ON SCHEMA public TO prizy_app;

-- Default privileges for objects that the superuser 'prizy' might create
ALTER DEFAULT PRIVILEGES FOR ROLE prizy IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES TO prizy_app;
ALTER DEFAULT PRIVILEGES FOR ROLE prizy IN SCHEMA public
    GRANT ALL ON SEQUENCES TO prizy_app;
ALTER DEFAULT PRIVILEGES FOR ROLE prizy IN SCHEMA public
    GRANT EXECUTE ON FUNCTIONS TO prizy_app;

-- ── prizy_test (test database) ───────────────────────────────────────────────

CREATE DATABASE prizy_test;
GRANT ALL PRIVILEGES ON DATABASE prizy_test TO prizy_app;
\c prizy_test
GRANT ALL ON SCHEMA public TO prizy_app;
