# External Integrations

**Analyzed:** 2026-07-05

## Database

**Service:** PostgreSQL (relational database).
**Purpose:** Primary persistence for users, transactions, categories.
**Implementation:** Spring Data JPA / Hibernate. Driver `org.postgresql:postgresql` (`finsight-backend/pom.xml`, lines 68-72). Datasource wired in `finsight-backend/src/main/resources/application.properties`.
**Local provisioning:** `finsight-backend/docker-compose.yml` builds and runs the API container (`network_mode: host`), reading DB connection from environment. There is no Postgres service block in the compose file — a database is expected to already be reachable at the configured URL (e.g. a locally installed Postgres or an external instance).
**Configuration:** via env vars resolved by `spring-dotenv` (`me.paulschwarz:spring-dotenv`, `pom.xml` lines 73-77). Keys: `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`. `spring.dotenv.filename=.env.${spring.profiles.active:.local}` selects the env file per profile.
**Schema management:** `spring.jpa.hibernate.ddl-auto=update` — Hibernate auto-generates/updates the schema at startup. No migration tool is present despite the README claiming Flyway. See `CONCERNS.md` (No database migration tool).
**Authentication:** DB username/password from env.

## Authentication (JWT)

**Service:** JSON Web Tokens via `io.jsonwebtoken` (jjwt `0.12.6`: `jjwt-api`, `jjwt-impl`, `jjwt-jackson`; `pom.xml` lines 42-59), layered on Spring Security (`spring-boot-starter-security`).
**Purpose:** Stateless auth for the REST API; token issued at login and validated on each request.
**Implementation:** JWT filter and `UserDetails` service under `finsight-backend/src/main/java/com/lcs/finsight/security/`. Controllers resolve the caller via `@AuthenticationPrincipal UserDetails` (see `FinancialTransactionController`).
**Configuration:** `jwt.secret-key=${JWT_SECRET_KEY}` and `jwt.expiration-ms=${JWT_EXPIRATION_MS:86400000}` (24h default) in `application.properties`. Secret sourced from the `JWT_SECRET_KEY` env var.
**Authentication:** HMAC-signed tokens; secret must be supplied via environment (never hardcoded).

## API Integrations

### Nubank CSV Import (inbound external data)

**Purpose:** Primary "external data" integration — ingests a user's transaction history exported from the Nubank bank/card as a CSV file. This is a manual file upload, not a live bank API.
**Location:**

- Controller: `finsight-backend/src/main/java/com/lcs/finsight/controllers/FinancialTransactionController.java` — `POST /import` (`importCsv`, `@RequestParam("file") MultipartFile`), returning `FinancialTransactionImportResponseDto` with the imported count.
- Service: `finsight-backend/src/main/java/com/lcs/finsight/services/FinancialTransactionService.java` — `importFromNubankCsv(MultipartFile, User)` (lines 140-192).

**Endpoint:** `POST /api/finsight/financial-transaction/import` (base path from `ApiRoutes.FINANCIAL_TRANSACTION`), `multipart/form-data`, field name `file`.
**Parsing behavior:**

- Reads UTF-8 lines, skips the header row (loop starts at index 1) and blank lines.
- Splits each row into 4 columns: `date` (`dd/MM/yyyy`), `amount` (BigDecimal), `externalId`, `description`.
- Sign convention: amount `>= 0` → `CREDIT`, `< 0` → `DEBIT`; the stored amount is `abs()`.
- **Deduplication:** looks up already-persisted `externalId`s for the user via `financialTransactionRepository.findExistingExternalIds(...)` and skips rows whose `externalId` already exists, then `saveAll` the remainder.

**Fragility note:** parse errors throw a wrapped `RuntimeException("Erro ao processar o arquivo CSV.")`; a malformed row can abort the whole import. Format is positional (assumes Nubank's exact 4-column layout). See `CONCERNS.md`.
**Upload limits:** `spring.servlet.multipart.max-file-size=50MB` / `max-request-size=50MB` (`application.properties`).
**Authentication:** requires a valid JWT (resolves the owning `User` from the principal).

### API Documentation (SpringDoc / OpenAPI)

**Purpose:** Interactive API docs / Swagger UI.
**Location:** `springdoc-openapi-starter-webmvc-ui` `2.8.9` (`pom.xml` lines 94-99). Endpoints tagged via `@Tag`/`@Operation` annotations on controllers.
**Configuration:** enabled in `application.properties` (`springdoc.swagger-ui.enabled=true`, `springdoc.api-docs.enabled=true`, alpha sorting).
**URL:** `http://<host>:<port>/swagger-ui.html` (default server port is `3000`, not the `8080` the README states — see `CONCERNS.md`).

### Frontend → Backend HTTP client

**Purpose:** The React SPA consumes the Spring Boot REST API.
**Location:** `finsight-frontend/src/api/clients/finsightApi.ts` — an Axios instance.
**Configuration:** `baseURL: import.meta.env.VITE_FINSIGHT_API_URL` (set in `finsight-frontend/.env.development` / `.env.production`).
**Authentication:** request interceptor injects `Authorization: Bearer <token>`, where the token is read via a pluggable accessor (`getAccessToken` → `getItemFromStorage(STORAGE_KEYS.accessToken)`, overridable via `setAccessTokenAccessor`). A pass-through response interceptor is in place (no global 401/refresh handling yet).
**Data layer:** TanStack Query (`@tanstack/react-query`) service hooks wrap the client (per `finsight-frontend/CLAUDE.md`); components never call Axios directly.
**CORS:** backend allowed origins come from the `ALLOWED_ORIGINS` env var (`docker-compose.yml`).

## Deployment / CI

### Frontend deploy (GitHub Actions)

**Location:** `finsight-frontend/.github/workflows/deploy.yml`.
**Trigger:** push to `main`.
**Flow:** `actions/checkout@v4` → `setup-node@v4` (Node 20) → `npm ci` → `npm run build:prod` → deploy the built `dist/*` to a server over SCP via `appleboy/scp-action@v0.1.7`, target `/var/www/finsight` (served as static files, e.g. behind nginx).
**Secrets:** `SERVER_HOST`, `SERVER_USER`, `SERVER_PASSWORD` (GitHub Actions secrets). Note: password-based SCP auth. No test/lint gate runs before deploy.

### Backend container

**Location:** `finsight-backend/Dockerfile` — multi-stage build (`maven:3.9-eclipse-temurin-17` build stage → `eclipse-temurin:17-jre-alpine` runtime), packages the fat JAR with `mvn -DskipTests package`, `EXPOSE 3000`.
**Orchestration:** `finsight-backend/docker-compose.yml` (`build: .`, `network_mode: host`, `restart: unless-stopped`), injecting `SPRING_DATASOURCE_*`, `JWT_SECRET_KEY`, `ALLOWED_ORIGINS` from the environment.
**Note:** the Docker image builds on JDK 17, matching `pom.xml` (`java.version=17`) but not the README's stated Java 21. See `CONCERNS.md`.

## Not Present

No message queue, no background job/scheduler infrastructure, no third-party payment, email, or notification providers, and no live banking/aggregation API were found in the codebase. External data enters only through the manual Nubank CSV upload described above.
