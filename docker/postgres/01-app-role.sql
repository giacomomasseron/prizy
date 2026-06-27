-- Creates a limited-privilege application role so that PostgreSQL Row-Level
-- Security policies apply to the app connection.
--
-- The POSTGRES_USER ('prizy') is a superuser by design; superusers bypass
-- RLS unconditionally, even with FORCE ROW LEVEL SECURITY.  The app must
-- connect as a *non*-superuser ('prizy_app') so the workspace-isolation
-- RLS policies actually filter rows.
--
-- Privileges needed:
--   • CONNECT on the database
--   • CREATE, USAGE on the public schema  (migrations create tables)
--   • DEFAULT PRIVILEGES for all tables / sequences / functions created
--     by 'prizy' in the public schema (migration runner is 'prizy_app' so
--     it will own its own objects; ALTER DEFAULT PRIVILEGES covers any
--     superuser-owned objects that get re-used)
--
-- The prizy_test database (used by the test suite via DB_DATABASE_TEST)
-- gets the same treatment via the LOOP below.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'prizy_app') THEN
        CREATE ROLE prizy_app WITH LOGIN PASSWORD 'secret';
    END IF;
END
$$;

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
