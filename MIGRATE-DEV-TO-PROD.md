# Migrating the real data into the prod database

One-off migration. The database named `dev_finsight` on the VPS is where the real
data has been living all along (it served as prod before a real prod DB existed).
A fresh, empty `finsight` database now exists on the **same PostgreSQL instance**;
this migration copies everything across so `finsight` becomes prod and
`dev_finsight` is freed up to become the throwaway test database.

It copies **all** rows — every user, not just the two accounts you care about —
because a full copy avoids FK-ordering problems and the target starts empty.
Deleting the users you don't want is a manual step afterwards, not part of this.

## Where to run it

**On the VPS**, in a terminal inside your RDP session. Both databases are local
there, so there is no SSH tunnel, no firewalled `5432`, and no file to copy
between machines. Nothing runs on your laptop.

The script is standalone — it does not need the repo or any `.env` file. Copy it
to the VPS (RDP shared folder, `scp`, or just paste it into an editor there).

## Before running

- The `finsight` database must **already have the schema**. A data-only load into
  an empty-of-tables database fails. If it has no tables yet, boot the API once
  pointed at `finsight` so Flyway builds the schema, then stop it and come back.
- Both databases must be on the same Flyway version — the script checks this and
  aborts on a mismatch, since a data-only dump assumes identical columns.
- Nobody should be writing to `dev_finsight` during the copy. Stop the API
  container first if it is running (`docker compose down` at the repo root).

## Run

```bash
sudo -u postgres bash migrate-dev-to-prod.sh
```

Running as `postgres` is recommended: it needs no password (peer auth) and lets
the restore temporarily disable foreign-key triggers, which removes any table
ordering risk. As a non-superuser it still works, but prompts for a password and
relies on the dump's natural ordering.

Defaults can be overridden with environment variables — `SRC_DB`, `DST_DB`,
`PGHOST`, `PGPORT`, `PGUSER`, `BACKUP_DIR` (default `/var/tmp/finsight-migration`).

It will:

1. Check both databases exist, that the target carries the schema, and that both
   are on the same Flyway version.
2. Verify the target is empty across **every** table, not just `users`.
3. Back up `dev_finsight` in full (schema + data) — it is currently the only copy
   of your real data, so this is the backup that actually matters.
4. Back up the target as it was, then dump `dev_finsight`'s data
   (`flyway_schema_history` excluded — the target has its own migration history
   and copying it in would collide on the primary key).
5. Ask for a typed `yes`.
6. Restore in a single transaction (all-or-nothing).
7. Compare row counts table by table, source vs target, and fail loudly if any
   table differs.

All three files land in `/var/tmp/finsight-migration/`.

## After running

1. Point the API at the new database: in the API's environment (the Portainer stack, or `.env` at the repo root), change
   the datasource URL from `.../dev_finsight` to `.../finsight`. Since the API runs
   on the same VPS, `localhost:5432/finsight` (no `sslmode=require`) is simpler than
   going back out through the public IP.
2. Rebuild/restart the API container and confirm it boots — Flyway should report
   nothing to do, and `ddl-auto=validate` proves the schema matches.
3. Log in through the frontend and check that both accounts are there with their
   transactions. **Do not delete anything before this passes.**
4. Delete the migrated users/plans you don't want — removal cascades through
   `plan_memberships` / `financial_transactions` / etc. via `plan_id`.
5. Keep the dumps until you are confident the cleanup went fine.

Once the cutover is verified, `dev_finsight` no longer holds the only copy of the
real data, which unblocks step 2 of the deferred `*IT` work in
`.specs/project/STATE.md` — repointing the integration tests at `dev_finsight` as
the throwaway test database. Never point the tests at `finsight`: they
`TRUNCATE ... CASCADE` every table before each test.

## If something goes wrong

The restore is a single transaction, so a failure mid-way leaves `finsight`
untouched and empty. If the row-count check fails after a successful load,
truncate the target (or restore it from `finsight_before_migration_<ts>.dump`) and
re-run once the cause is understood. `dev_finsight` is never written to by this
script.
