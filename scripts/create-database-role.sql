-- Creates the role and database Prizy connects to on an external PostgreSQL
-- server (16 or newer). Run it once, with psql, as an administrator that can
-- create roles and databases: `postgres` on your own server, the admin user a
-- managed service gives you.
--
--   psql -h db.internal -U postgres -v app_password=... -f create-database-role.sql
--
-- Optional: -v app_user=... (default prizy_app) and -v app_database=...
-- (default prizy), which then go to the installer as --db-user and --db-name.
-- Running it again changes nothing but the role's password.
--
-- Why a role of its own: workspaces are kept apart by row-level security,
-- which PostgreSQL skips for superusers and BYPASSRLS roles. The role created
-- here is neither. It runs the migrations itself, so it owns every table, and
-- the policies still bind it because they are forced. These are the grants
-- docker/prod/postgres-init.sh gives the bundled database, less its default
-- privileges on tables an administrator creates: every table Prizy uses is
-- its own, and the deploy's check refuses one that is not.
\set ON_ERROR_STOP on

\if :{?app_password}
\else
    DO $$ BEGIN RAISE EXCEPTION 'no password given: run psql with -v app_password=...'; END $$;
\endif
\if :{?app_user}
\else
    \set app_user prizy_app
\endif
\if :{?app_database}
\else
    \set app_database prizy
\endif

SELECT NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_user') AS create_role \gset
\if :create_role
    CREATE ROLE :"app_user" WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE PASSWORD :'app_password';
\else
    ALTER ROLE :"app_user" WITH LOGIN PASSWORD :'app_password';
\endif

SELECT NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'app_database') AS create_database \gset
\if :create_database
    CREATE DATABASE :"app_database";
\endif
GRANT ALL PRIVILEGES ON DATABASE :"app_database" TO :"app_user";

\connect :"app_database"

-- Migrations create the tables, and the pgcrypto and citext extensions, in
-- the public schema, as the app's role.
GRANT ALL ON SCHEMA public TO :"app_user";
