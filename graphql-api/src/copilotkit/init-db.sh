#!/bin/bash
set -euo pipefail

# Database initialization script for CopilotKit chat history
# This script initializes the PostgreSQL database with the required schema

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA_FILE="${SCRIPT_DIR}/schema.sql"

echo "======================================"
echo "gnomAD CopilotKit Database Init"
echo "======================================"
echo ""

# Check if schema file exists
if [ ! -f "${SCHEMA_FILE}" ]; then
    echo "ERROR: Schema file not found: ${SCHEMA_FILE}"
    exit 1
fi

echo "Schema file: ${SCHEMA_FILE}"
echo ""

# Parse DATABASE_URL or use individual components
if [ -n "${DATABASE_URL:-}" ]; then
    echo "Using DATABASE_URL from environment"

    # Parse DATABASE_URL: postgresql://user:pass@host:port/dbname
    # Extract components using parameter expansion
    DB_URL_NO_PROTO="${DATABASE_URL#postgresql://}"
    DB_URL_NO_PROTO="${DB_URL_NO_PROTO#postgres://}"

    # Extract user:pass@host:port/dbname
    DB_USER_PASS="${DB_URL_NO_PROTO%%@*}"
    DB_HOST_PORT_DB="${DB_URL_NO_PROTO#*@}"

    # Extract user and password
    DB_USER="${DB_USER_PASS%%:*}"
    DB_PASS="${DB_USER_PASS#*:}"

    # Extract host:port and dbname
    DB_HOST_PORT="${DB_HOST_PORT_DB%%/*}"
    DB_NAME="${DB_HOST_PORT_DB#*/}"

    # Extract host and port
    DB_HOST="${DB_HOST_PORT%%:*}"
    DB_PORT="${DB_HOST_PORT#*:}"

    # If port is same as host, no port was specified, use default
    if [ "${DB_PORT}" = "${DB_HOST}" ]; then
        DB_PORT="5432"
    fi
else
    # Use individual environment variables with defaults
    DB_HOST="${POSTGRES_HOST:-localhost}"
    DB_PORT="${POSTGRES_PORT:-5432}"
    DB_USER="${POSTGRES_USER:-gnomad}"
    DB_PASS="${POSTGRES_PASSWORD:-gnomad_dev}"
    DB_NAME="${POSTGRES_DB:-gnomad_copilot}"
fi

echo "Database connection:"
echo "  Host: ${DB_HOST}"
echo "  Port: ${DB_PORT}"
echo "  User: ${DB_USER}"
echo "  Database: ${DB_NAME}"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "ERROR: psql command not found"
    echo "Please install PostgreSQL client:"
    echo "  - macOS: brew install postgresql"
    echo "  - Ubuntu/Debian: apt-get install postgresql-client"
    echo "  - Alpine: apk add postgresql-client"
    exit 1
fi

# Test connection
echo "Testing database connection..."
export PGPASSWORD="${DB_PASS}"

if ! psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c "SELECT 1" > /dev/null 2>&1; then
    echo ""
    echo "ERROR: Unable to connect to database"
    echo ""
    echo "Please ensure:"
    echo "  1. PostgreSQL is running"
    echo "  2. Database '${DB_NAME}' exists"
    echo "  3. User '${DB_USER}' has access"
    echo "  4. Connection details are correct"
    echo ""
    echo "To create the database if it doesn't exist:"
    echo "  psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d postgres -c \"CREATE DATABASE ${DB_NAME};\""
    exit 1
fi

echo "✓ Connection successful"
echo ""

# Check if tables already exist
echo "Checking for existing schema..."
TABLE_EXISTS=$(psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -t -c \
    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'chat_threads');" | tr -d '[:space:]')

if [ "${TABLE_EXISTS}" = "t" ]; then
    echo "⚠ Schema already exists"
    echo ""
    read -p "Do you want to drop and recreate the schema? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted"
        exit 0
    fi

    echo "Dropping existing schema..."
    psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -c \
        "DROP TABLE IF EXISTS tool_results CASCADE; DROP TABLE IF EXISTS chat_messages CASCADE; DROP TABLE IF EXISTS chat_threads CASCADE; DROP VIEW IF EXISTS chat_analytics CASCADE;"
    echo "✓ Existing schema dropped"
    echo ""
fi

# Apply schema
echo "Applying schema..."
psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -f "${SCHEMA_FILE}"

if [ $? -eq 0 ]; then
    echo ""
    echo "======================================"
    echo "✓ Database initialized successfully!"
    echo "======================================"
    echo ""
    echo "Schema includes:"
    echo "  - chat_threads table"
    echo "  - chat_messages table"
    echo "  - tool_results table"
    echo "  - Indexes for efficient queries"
    echo "  - chat_analytics view"
    echo ""
    echo "The database is ready for CopilotKit chat history."
else
    echo ""
    echo "======================================"
    echo "✗ Schema initialization failed"
    echo "======================================"
    exit 1
fi

# Clean up password from environment
unset PGPASSWORD
