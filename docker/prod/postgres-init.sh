#!/bin/bash
# Creates the application's database role on a FRESH Postgres volume.
#
# Runs once, via /docker-entrypoint-initdb.d, as the superuser. The
# development equivalent (docker/postgres/01-app-role.sql) hardcodes the
# password and also creates a prizy_test database; neither belongs here.
#
# Why a separate, non-superuser role at all: PostgreSQL superusers bypass
# row-level security unconditionally, even under FORCE ROW LEVEL SECURITY.
# The application connects as prizy_app so the workspace-isolation policies
# actually filter rows. The migrations run as this role too, so it OWNS the
# tables — FORCE ROW LEVEL SECURITY only applies to a table's owner.
set -e

: "${PRIZY_APP_DB_PASSWORD:?PRIZY_APP_DB_PASSWORD is required}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'prizy_app') THEN
            CREATE ROLE prizy_app WITH LOGIN PASSWORD '${PRIZY_APP_DB_PASSWORD}';
        END IF;
    END
    \$\$;

    GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO prizy_app;
    GRANT ALL PRIVILEGES ON DATABASE ${POSTGRES_DB} TO prizy_app;

    -- Migrations run as prizy_app and CREATE TABLE in the public schema.
    GRANT ALL ON SCHEMA public TO prizy_app;

    -- Safety net for anything the superuser creates in public later.
    ALTER DEFAULT PRIVILEGES FOR ROLE ${POSTGRES_USER} IN SCHEMA public
        GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES TO prizy_app;
    ALTER DEFAULT PRIVILEGES FOR ROLE ${POSTGRES_USER} IN SCHEMA public
        GRANT ALL ON SEQUENCES TO prizy_app;
    ALTER DEFAULT PRIVILEGES FOR ROLE ${POSTGRES_USER} IN SCHEMA public
        GRANT EXECUTE ON FUNCTIONS TO prizy_app;
EOSQL
