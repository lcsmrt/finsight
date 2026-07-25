#!/usr/bin/env bash
#
# One-off migration: copies ALL data from the legacy database (dev_finsight, which
# currently holds the real data) into the freshly-created, empty prod database
# (finsight). Both live in the SAME PostgreSQL instance on the VPS.
#
# RUN THIS ON THE VPS, not on your laptop — that way both databases are local
# (no SSH tunnel, no firewall, no file transfer).
#
#   sudo -u postgres bash migrate-dev-to-prod.sh
#
# Overridable via environment:
#   SRC_DB (dev_finsight)  DST_DB (finsight)  PGHOST (localhost)  PGPORT (5432)
#   PGUSER (postgres)      PGPASSWORD (prompted if needed)
#   BACKUP_DIR (/var/tmp/finsight-migration)
#   SKIP_FLYWAY_CHECK=1    bypass the schema-version parity gate (see below)

set -euo pipefail

SRC_DB="${SRC_DB:-dev_finsight}"
DST_DB="${DST_DB:-finsight}"
BACKUP_DIR="${BACKUP_DIR:-/var/tmp/finsight-migration}"

export PGHOST="${PGHOST:-localhost}"
export PGPORT="${PGPORT:-5432}"
export PGUSER="${PGUSER:-postgres}"

FLYWAY_TABLE="flyway_schema_history"

for bin in psql pg_dump pg_restore; do
  command -v "$bin" >/dev/null || { echo "$bin not found on this machine." >&2; exit 1; }
done

# --- auth: try passwordless (peer/trust) first, prompt only if the server asks ---
if [[ -z "${PGPASSWORD:-}" ]]; then
  if ! psql -d postgres -tAqc "SELECT 1" >/dev/null 2>&1; then
    read -rsp "Password for PostgreSQL user '${PGUSER}': " PGPASSWORD
    echo
    export PGPASSWORD
  fi
fi

q() { psql -d "$1" -tAqc "$2"; }

if ! q postgres "SELECT 1" >/dev/null 2>&1; then
  echo "Cannot connect to ${PGHOST}:${PGPORT} as '${PGUSER}'." >&2
  exit 1
fi

echo "source -> ${PGHOST}:${PGPORT}/${SRC_DB}   (real data, read-only in this script)"
echo "target -> ${PGHOST}:${PGPORT}/${DST_DB}   (must be empty)"
echo

# --- both databases must exist ---
for db in "$SRC_DB" "$DST_DB"; do
  if [[ "$(q postgres "SELECT count(*) FROM pg_database WHERE datname = '${db}'")" != "1" ]]; then
    echo "ABORT: database '${db}' does not exist on this server." >&2
    echo "Existing databases:" >&2
    psql -d postgres -c "\l" >&2
    exit 1
  fi
done

if [[ "$SRC_DB" == "$DST_DB" ]]; then
  echo "ABORT: source and target are the same database ('${SRC_DB}')." >&2
  exit 1
fi

# --- target must already carry the schema (this is a DATA-ONLY restore) ---
if [[ "$(q "$DST_DB" "SELECT to_regclass('public.users') IS NOT NULL")" != "t" ]]; then
  echo "ABORT: '${DST_DB}' has no 'users' table — its schema was never created." >&2
  echo "Boot the API once against ${DST_DB} so Flyway builds the schema, then re-run." >&2
  exit 1
fi

# --- schema-version parity: a data-only restore assumes identical column sets ---
SRC_V="$(q "$SRC_DB" "SELECT version FROM ${FLYWAY_TABLE} WHERE success ORDER BY installed_rank DESC LIMIT 1")"
DST_V="$(q "$DST_DB" "SELECT version FROM ${FLYWAY_TABLE} WHERE success ORDER BY installed_rank DESC LIMIT 1")"
echo "flyway version: ${SRC_DB}=V${SRC_V:-?}  ${DST_DB}=V${DST_V:-?}"
if [[ "$SRC_V" != "$DST_V" ]]; then
  echo "ABORT: schema versions differ — the dumped columns would not match the target." >&2
  echo "Bring both to the same migration first (or set SKIP_FLYWAY_CHECK=1 if you are sure)." >&2
  [[ "${SKIP_FLYWAY_CHECK:-0}" == "1" ]] || exit 1
  echo "SKIP_FLYWAY_CHECK=1 set — continuing anyway." >&2
fi
echo

# --- table list, driven by the source schema (flyway's own table is never copied) ---
mapfile -t TABLES < <(q "$SRC_DB" "
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public' AND tablename <> '${FLYWAY_TABLE}'
  ORDER BY tablename")
[[ ${#TABLES[@]} -gt 0 ]] || { echo "ABORT: no tables found in ${SRC_DB}.public." >&2; exit 1; }

# --- target must be empty across every table, not just users ---
echo "Checking '${DST_DB}' is empty..."
NON_EMPTY=()
for t in "${TABLES[@]}"; do
  n="$(q "$DST_DB" "SELECT count(*) FROM \"${t}\"" 2>/dev/null || echo "missing")"
  [[ "$n" == "0" ]] || NON_EMPTY+=("${t}=${n}")
done
if [[ ${#NON_EMPTY[@]} -gt 0 ]]; then
  echo "ABORT: '${DST_DB}' is not empty: ${NON_EMPTY[*]}" >&2
  echo "This script only ever seeds a virgin database. Investigate before proceeding." >&2
  exit 1
fi
echo "OK, all ${#TABLES[@]} tables are empty."
echo

# --- backups: the source is the ONLY copy of the real data, so back that up too ---
mkdir -p "$BACKUP_DIR"
TS="$(date +%Y%m%d_%H%M%S)"
SRC_BACKUP="${BACKUP_DIR}/${SRC_DB}_full_${TS}.dump"
DST_BACKUP="${BACKUP_DIR}/${DST_DB}_before_migration_${TS}.dump"
DATA_DUMP="${BACKUP_DIR}/${SRC_DB}_data_${TS}.dump"

echo "Backing up ${SRC_DB} (full, schema + data) -> ${SRC_BACKUP}"
pg_dump --format=custom -d "$SRC_DB" -f "$SRC_BACKUP"

echo "Backing up ${DST_DB} (pre-migration, schema-only in practice) -> ${DST_BACKUP}"
pg_dump --format=custom -d "$DST_DB" -f "$DST_BACKUP"

echo "Dumping ${SRC_DB} data (excluding ${FLYWAY_TABLE}) -> ${DATA_DUMP}"
pg_dump --data-only --format=custom --exclude-table="$FLYWAY_TABLE" \
  -d "$SRC_DB" -f "$DATA_DUMP"
echo

# --- FK ordering: superuser can disable triggers during the load ---
RESTORE_FLAGS=(--no-owner --no-privileges --single-transaction)
if [[ "$(q postgres "SELECT rolsuper FROM pg_roles WHERE rolname = current_user")" == "t" ]]; then
  RESTORE_FLAGS+=(--disable-triggers)
else
  echo "NOTE: '${PGUSER}' is not a superuser, so foreign-key triggers stay active during"
  echo "      the load. If the restore fails on FK ordering, re-run as the postgres user:"
  echo "        sudo -u postgres bash $(basename "${BASH_SOURCE[0]}")"
  echo
fi

read -r -p "About to load ${#TABLES[@]} tables of real data into '${DST_DB}'. Type 'yes' to continue: " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
  echo "Aborted, nothing written to ${DST_DB}."
  exit 1
fi

echo "Restoring (single transaction, all-or-nothing)..."
pg_restore "${RESTORE_FLAGS[@]}" -d "$DST_DB" "$DATA_DUMP"
echo

# --- verification: row counts must match table by table ---
echo "Row counts:"
printf '  %-38s %10s %10s   %s\n' "TABLE" "$SRC_DB" "$DST_DB" ""
MISMATCH=0
for t in "${TABLES[@]}"; do
  a="$(q "$SRC_DB" "SELECT count(*) FROM \"${t}\"")"
  b="$(q "$DST_DB" "SELECT count(*) FROM \"${t}\"")"
  if [[ "$a" == "$b" ]]; then mark="ok"; else mark="MISMATCH"; MISMATCH=1; fi
  printf '  %-38s %10s %10s   %s\n' "$t" "$a" "$b" "$mark"
done
echo

if [[ "$MISMATCH" == "1" ]]; then
  echo "FAILED: row counts differ — do NOT cut over. Restore ${DST_DB} from ${DST_BACKUP}" >&2
  echo "or truncate it and re-run once the cause is understood." >&2
  exit 1
fi

echo "Done — ${DST_DB} is a faithful copy of ${SRC_DB}."
echo "Files kept in ${BACKUP_DIR}:"
echo "  ${SRC_BACKUP}   (full backup of the real data — keep this one longest)"
echo "  ${DST_BACKUP}   (target as it was before the migration)"
echo "  ${DATA_DUMP}    (what was loaded)"
echo
echo "Next: point the API at '${DST_DB}' (.env.production) and restart it, then log in"
echo "and confirm your accounts before deleting anything. See MIGRATE-DEV-TO-PROD.md."
