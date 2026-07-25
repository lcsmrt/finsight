# Tech Stack

**Analyzed:** 2026-07-05

Monorepo at `/home/lcs/dev/finsight` with two independent apps: `finsight-backend` (Spring Boot REST API) and `finsight-frontend` (React SPA). Git is not initialized at the root.

## Core

- Framework: Spring Boot 3.5.3 (backend) + React 19 (frontend)
- Language: Java 17 (backend), TypeScript ~5.7 (frontend)
- Runtime: JVM 17 (backend), Node/Vite 6 (frontend)
- Package manager: Maven (backend), npm (frontend)

> **Discrepancy:** `finsight-backend/README.md` states Java 21, but `pom.xml` declares `<java.version>17</java.version>`. Java 17 is authoritative.

## Frontend

- UI Framework: React 19 + react-router-dom 7.6 (SPA)
- Build: Vite 6 (`@vitejs/plugin-react`)
- Styling: Tailwind CSS v4.1 via `@tailwindcss/vite` (no `tailwind.config`; CSS in `src/styles/globals.css`), `class-variance-authority`, `tailwind-merge`, `tw-animate-css`
- Component system: shadcn/ui (new-york style; primitives under `src/components/<name>/`, not `components/ui`), `@base-ui/react` 1.3, `lucide-react` 0.487 icons
- Data/State: `@tanstack/react-query` 5.72 (server state), React Context (global auth state), `@tanstack/react-table` 8.21
- Data fetching: axios 1.8
- Charts: recharts 2.15
- Form Handling: react-hook-form 7.55 + zod 3.24 (`@hookform/resolvers` 5)
- Dates: date-fns 4.1; Toasts: sonner 2.0

## Backend

- API Style: REST via Spring Web (`@RestController`); base path `/api/finsight`
- Database: PostgreSQL (`org.postgresql`, `PostgreSQLDialect`) via Spring Data JPA / Hibernate
- ORM config: `spring.jpa.hibernate.ddl-auto=update` (schema managed by Hibernate — **no migration tool**), `globally_quoted_identifiers=true`, camelCase→snake_case naming
- Authentication: Spring Security + JWT bearer tokens (`io.jsonwebtoken` jjwt 0.12.6 api/impl/jackson); user resolved by email from token via `@AuthenticationPrincipal`
- Validation: Spring Validation (`spring-boot-starter-validation`)
- API docs: springdoc-openapi 2.8.9 (Swagger UI at `/swagger-ui.html`)
- Config loading: `me.paulschwarz:spring-dotenv` 4.0.0 (reads `.env`)
- Server port: 3000 (not the Spring default 8080)

> **Discrepancy:** README claims Flyway migrations, but there is no Flyway/Liquibase dependency and no `db/migration` folder. Schema is created/updated by Hibernate `ddl-auto=update`.

## Testing

- Backend Unit/Integration: `spring-boot-starter-test` (JUnit/Mockito) — dependency present; minimal test coverage
- Frontend Unit/Component: Vitest 3 + Storybook 9 (`@storybook/addon-vitest`, `@vitest/browser`, `@vitest/coverage-v8`)
- Frontend E2E: Playwright 1.55 (available via Vitest browser runner)

## External Services

- Database: PostgreSQL (local instance via `finsight-backend/docker-compose.yml`)
- No third-party API integrations, message queues, or payment providers

## Development Tools

- Backend: `spring-boot-devtools`, Maven wrapper (`mvnw`), Dockerfile + docker-compose
- Frontend: ESLint 9 (`typescript-eslint`, `eslint-plugin-check-file`, `eslint-plugin-import`, react-hooks/react-refresh/storybook plugins), Prettier 3 (+ `prettier-plugin-tailwindcss`), Husky 9 git hooks
- No Lombok, no MapStruct on the backend (DTO mapping is manual)

## Backend Configuration (`.env`)

`SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `JWT_SECRET_KEY`. Frontend uses `VITE_FINSIGHT_API_URL` for the axios base URL.
