# finSight

Personal finance tracker: import real bank transactions, understand where the money went, and see upcoming bills by registering recurring/installment commitments.

Monorepo with two apps:

| App | Stack | Path |
| --- | ----- | ---- |
| **Backend** | Java 17 · Spring Boot 3.5 · PostgreSQL · JWT | [`backend/`](./backend) |
| **Frontend** | React 19 · Vite 6 · TanStack Query · Tailwind v4 | [`frontend/`](./frontend) |

## Run it locally

The app needs a reachable **PostgreSQL** — it is not bundled here. Connect to your own instance (e.g. a managed DB over an SSH tunnel).

```bash
# 1. Make your PostgreSQL reachable (your own instance / tunnel).

# 2. Install dependencies (pnpm workspace: frontend + backend)
pnpm install

# 3. Backend — configure env once (Flyway applies the schema on boot)
cd backend
cp .env.example .env        # fill SPRING_DATASOURCE_* + JWT_SECRET_KEY
cd ..

# 4. Run both apps together (backend → http://localhost:3000, Swagger: /swagger-ui.html)
pnpm dev
```

`pnpm dev` runs every workspace package's `dev` script in parallel: `./mvnw
spring-boot:run` in `backend/` and `vite` in `frontend/` (reads `.env.development` →
talks to localhost:3000). Run them individually with `pnpm --filter finsight-backend dev`
or `pnpm --filter finsight-frontend dev`.

See each app's README for details:
- [Backend README](./backend/README.md) — env vars, endpoints, tests
- [Frontend README](./frontend/README.md) — commands, trying the recurring feature

## Deploy

One Docker stack for both apps, run on the VPS through Portainer. See
[DEPLOY.md](./DEPLOY.md) for the full procedure.

| Service | Image | Networking |
| ------- | ----- | ---------- |
| `finsight-api` | [`backend/Dockerfile`](./backend/Dockerfile) — Maven build → JRE | host network, port 3000 (not published) |
| `finsight-web` | [`frontend/Dockerfile`](./frontend/Dockerfile) — Vite build → nginx | publishes `${WEB_PORT}` → 80 |

`finsight-web` is the only public entry point: nginx serves the built SPA and
proxies `/api/` to the API on the host, so the browser stays same-origin (no CORS,
no IP baked into the bundle). Variables are documented in
[`.env.production.example`](./.env.production.example); real values live in the
Portainer stack, never in the repo.

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
