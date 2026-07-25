# Deploying finSight

Both apps ship as one Docker stack, built from this repo and run on the VPS
through Portainer. The whole app is served from a single public port.

```
browser ──> :WEB_PORT ─ finsight-web (nginx) ─┬─> /            static SPA
                                              └─> /api/…       proxy to host:3000
                                                                     │
                                              finsight-api (host network)
                                                                     │
                                                        PostgreSQL on localhost:5432
```

The API's port 3000 is not published by Docker — it listens on the host because
the container uses `network_mode: host`, which is also how it reaches a
PostgreSQL that only accepts connections on localhost.

## Variables

Documented in [`.env.production.example`](./.env.production.example). Set them in
the Portainer stack editor; never commit real values.

| Variable | Notes |
| -------- | ----- |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/finsight` when the DB is on the same VPS |
| `SPRING_DATASOURCE_USERNAME` / `_PASSWORD` | database credentials |
| `JWT_SECRET_KEY` | `openssl rand -base64 64`. Changing it invalidates every issued token |
| `ALLOWED_ORIGINS` | only used for direct hits on port 3000; the SPA is same-origin |
| `WEB_PORT` | public port for the app (default `5000`) |

## First deploy

1. **Free the port.** Until now the SPA was served as static files under
   `/var/www/finsight` by a web server on the VPS. If it is listening on the port
   you pick for `WEB_PORT`, stop it first (or choose another port) — Docker cannot
   bind a port already in use.
2. **Portainer → Stacks → Add stack**, build method **Repository**:
   - Repository URL: this repo · Reference: `refs/heads/main`
   - Compose path: `docker-compose.yml`
3. Fill the environment variables from the table above.
4. **Deploy the stack.** The first build takes a few minutes (Maven downloads the
   dependency tree, npm installs the frontend).
5. Check `finsight-api`'s logs: Flyway should report the schema is current and
   Hibernate's `ddl-auto=validate` should pass. Then open
   `http://<vps>:<WEB_PORT>`, log in, and confirm data loads.

## Redeploying after a push

Use **Pull and redeploy** with *re-pull image* enabled in Portainer. The images
are built from source here (`build:` in the compose, no registry), so a plain
stack webhook is not enough: it recreates the containers from the image that was
already built and the new code never lands. This is the same trap mindmap hit.

Automating it means calling `PUT /stacks/{id}/git/redeploy` on the Portainer API
from a GitHub Action with a Portainer access token — mindmap's
`.github/workflows/deploy.yml` is a working reference. Not set up here yet.

## Rollback

The previous delivery path still exists on the VPS: the static bundle under
`/var/www/finsight` and its web server. Bringing that back plus stopping the
stack restores the old setup — but note the bundle now calls `/api/finsight`
relative to its own origin, so a rollback also needs the frontend rebuilt with an
absolute `VITE_FINSIGHT_API_URL`, or an equivalent `/api/` proxy on that server.

The scp-based `Deploy Frontend` workflow was removed when the container took over.
It is recoverable from history under its pre-rename path:
`git log --diff-filter=D -- finsight-frontend/.github/workflows/deploy.yml`.

## Local smoke test

```bash
cp .env.production.example .env   # point it at a database you don't mind touching
docker compose up --build         # app on http://localhost:5000
```

`.env` is git-ignored. Note that `network_mode: host` makes the API talk to
*your* machine's localhost, so `SPRING_DATASOURCE_URL` must be reachable from
there (an SSH tunnel to the VPS Postgres works).
