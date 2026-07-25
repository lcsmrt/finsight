# finSight

Personal finance tracker: import real bank transactions, understand where the money went, and see upcoming bills by registering recurring/installment commitments.

Monorepo with two apps:

| App | Stack | Path |
| --- | ----- | ---- |
| **Backend** | Java 17 · Spring Boot 3.5 · PostgreSQL · JWT | [`finsight-backend/`](./finsight-backend) |
| **Frontend** | React 19 · Vite 6 · TanStack Query · Tailwind v4 | [`finsight-frontend/`](./finsight-frontend) |

## Run it locally

The app needs a reachable **PostgreSQL** — it is not bundled here. Connect to your own instance (e.g. a managed DB over an SSH tunnel).

```bash
# 1. Make your PostgreSQL reachable (your own instance / tunnel).

# 2. Backend — configure and run (creates schema via ddl-auto=update on boot)
cd finsight-backend
cp .env.example .env        # fill SPRING_DATASOURCE_* + JWT_SECRET_KEY
./mvnw spring-boot:run      # http://localhost:3000  (Swagger: /swagger-ui.html)

# 3. Frontend — in another terminal
cd finsight-frontend
npm install
npm run dev                 # reads .env.development → talks to localhost:3000
```

See each app's README for details:
- [Backend README](./finsight-backend/README.md) — env vars, endpoints, tests
- [Frontend README](./finsight-frontend/README.md) — commands, trying the recurring feature

## Spec-Driven Development

This project is planned and built with the `tlc-spec-driven` workflow. All planning artifacts live in [`.specs/`](./.specs):

- `.specs/project/` — vision (`PROJECT.md`), roadmap (`ROADMAP.md`), and cross-session memory (`STATE.md` — **read this first when resuming**)
- `.specs/codebase/` — brownfield map of the code (stack, architecture, conventions, testing, concerns)
- `.specs/features/<name>/` — per-feature `spec.md` → `design.md` → `tasks.md`

Current feature: [`.specs/features/recurring-transactions/`](./.specs/features/recurring-transactions).

## Known gaps (roadmap M3)

- No DB migration tool yet — schema is managed by Hibernate `ddl-auto=update`.
- No automated backend test coverage beyond the series-generator unit test.

See `.specs/codebase/CONCERNS.md` for the full list.
