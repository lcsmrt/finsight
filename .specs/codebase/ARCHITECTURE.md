# Architecture

**Pattern:** Two-app monorepo — a layered Spring Boot monolith (`finsight-backend`) serving a REST API consumed by a feature-oriented React SPA (`finsight-frontend`). The apps are decoupled and communicate only over HTTP/JSON.

## High-Level Structure

```
finsight-frontend (React SPA)
  axios client (Bearer token) ──► HTTP/JSON
                                     │
                                     ▼
finsight-backend  (Spring Boot, port 3000, base path /api/finsight)
  Controllers ──► Services ──► Repositories/Specifications ──► JPA Entities
       ▲                                                          │
       └────────────── Response DTOs ◄────── PostgreSQL ◄─────────┘
  Security filter chain: JwtAuthenticationFilter → CustomUserDetailsService
```

Every backend request is scoped to the authenticated user; ownership is re-checked in the service layer.

## Backend Patterns

### Layered Monolith

**Location:** `finsight-backend/src/main/java/com/lcs/finsight/`
**Purpose:** Separate HTTP concerns, business logic, and persistence.
**Implementation:** Package-per-layer:

- `controllers/` — thin `@RestController`s that validate input and delegate; route roots come from `utils/ApiRoutes` constants (e.g. `BASE = "/api/finsight"`, `DASHBOARD`, `FINANCIAL_TRANSACTION`, `FINANCIAL_TRANSACTION_CATEGORY`, `AUTH`, `USER`).
- `services/` — `@Transactional` business logic (`AuthenticationService`, `DashboardService`, `FinancialTransactionService`, `FinancialTransactionCategoryService`, `UserService`).
- `repositories/` — Spring Data JPA interfaces extending `JpaRepository` + `JpaSpecificationExecutor`.
- `models/` — JPA entities.
- `specifications/` — dynamic query filters built as JPA `Specification`s.
- `dtos/request` + `dtos/response` — manual entity↔DTO mapping (no MapStruct).
- `security/`, `config/`, `exceptions/`, `utils/` — cross-cutting concerns.

**Example:** `controllers/DashboardController.java` resolves the user via `@AuthenticationPrincipal` and calls `dashboardService.getSummary(...)`; it holds no business logic.

### JWT Authentication (Security)

**Location:** `security/` (`JwtService`, `JwtAuthenticationFilter`, `CustomUserDetails`, `CustomUserDetailsService`) + `config/SecurityConfig`.
**Purpose:** Stateless bearer-token auth; identify the user on every request.
**Implementation:** A servlet filter validates the `Authorization: Bearer <token>`, extracts the email, and loads the user via `CustomUserDetailsService`. Controllers receive the principal through `@AuthenticationPrincipal`.

### Dynamic Filtering via Specifications

**Location:** `specifications/` + repositories implementing `JpaSpecificationExecutor`.
**Purpose:** Compose optional filters (date range, type, category) without hand-writing query permutations.
**Implementation:** Filter DTOs are translated into JPA `Specification` predicates and passed to the repository.

### Aggregation in Repository + Service

**Location:** `repositories/FinancialTransactionRepository` (JPQL) and `services/DashboardService`.
**Purpose:** Produce dashboard summaries without a reporting engine.
**Implementation:** JPQL queries `sumByUserAndTypeAndDateRange`, `findCategoryBreakdown`, and `findMonthlyTrend` (grouped by `year(startDate)`, `month(startDate)`, `type` with `SUM`); `DashboardService` assembles `DashboardSummaryDto` (`totalIncome`, `totalExpenses`, `netBalance`, `categoryBreakdown[]`, `monthlyTrend[]`). No forecasting/statistics yet.

### Domain Model

**Location:** `models/`. Three entities:

- `User` — id, name, email, password.
- `FinancialTransaction` — id, `user` (`@ManyToOne`), nullable `category` (`@ManyToOne`), `type` enum `CREDIT`/`DEBIT` stored as STRING (CREDIT = income, DEBIT = expense), `amount` (`BigDecimal`, absolute), description, `externalId` (CSV-import dedup), `frequency` (free-text recurrence hint, **not processed**), `parcelsNumber` (installments, **not processed**), `startDate`, nullable `endDate`. Indexed on `user_id`, `start_date`, and `(user_id, start_date)`.
- `FinancialTransactionCategory` — id, user, type, `description` (name), `spendingLimit` (`BigDecimal`, per-category budget).

## Frontend Patterns

### Feature-Oriented SPA

**Location:** `finsight-frontend/src/`
**Purpose:** Group code by feature rather than technical type.
**Implementation:**

- `api/` — axios client, DTOs, and TanStack Query service hooks.
- `app/` — bootstrap: `routing/`, `providers/`.
- `components/` — shared presentational shadcn-style primitives (no data hooks).
- `features/` — self-contained feature modules (pages, components, hooks).
- `hooks/`, `lib/`, `utils/` — shared logic.

**Example:** The whole app is currently one feature — `features/home/HomePage.tsx` (tabbed Overview + Transactions).

### Service-Hook Data Layer

**Location:** `api/clients/finsightApi.ts` + `api/services/*`.
**Purpose:** Centralize HTTP access and cache management; components never call axios directly.
**Implementation:** `finsightApi` sets `baseURL` from `VITE_FINSIGHT_API_URL` and a request interceptor injects the Bearer token. Service hooks (`useDashboardService.ts`, `useFinancialTransactionService.ts`, `useFinancialTransactionCategoryService.ts`, `useAuthService.ts`) wrap TanStack Query; mutations use `buildMutationOptions` for automatic toast + cache invalidation. Query keys follow `["entityName", params]`.
**Example:** `api/services/useDashboardService.ts` → `useGetDashboardSummary` does `finsightApi.get("/dashboard", { params })` with key `["dashboardSummary", params]`.

### Provider Composition & Routing

**Location:** `app/providers/AppProvider.tsx`, `app/routing/AppRouter.tsx`, `app/routing/paths.ts`.
**Purpose:** Wire global concerns and gate routes by auth.
**Implementation:** Providers nest `BrowserRouter → TanStackQueryProvider → AuthProvider → ConfirmDialog → CategoryFormDialog`. Auth state is exposed via `AuthProvider`/`useAuth` (React Context). `AppRouter` (react-router v7) uses `PATHS` constants; `PrivateRoute` gates authenticated routes under `MainLayout`, public routes render under `AuthLayout`.

### Charts

**Location:** `components/chart/Chart.tsx` (shadcn wrapper over recharts: `ChartContainer`, `ChartTooltip`, etc.).
**Example:** `features/home/components/overview/MonthlyTrendChart.tsx`, `CategorySpendingChart.tsx`.

## Data Flow

### Authentication

1. Frontend calls the auth endpoint (`useAuthService`) → backend `AuthenticationController`/`AuthenticationService` verifies credentials and returns a JWT.
2. Token is stored client-side; the axios request interceptor attaches `Authorization: Bearer <token>` on every call.
3. Backend `JwtAuthenticationFilter` validates the token → `CustomUserDetailsService` loads the `User` by email → the principal is available via `@AuthenticationPrincipal`.
4. Services re-check that the resource belongs to the authenticated user before acting.

### Transaction CRUD

1. UI in `features/home` (Transactions tab) calls `useFinancialTransactionService` hooks.
2. axios → `FinancialTransactionController` (`/api/finsight/financial-transaction`) → `FinancialTransactionService` (ownership check, `@Transactional`) → `FinancialTransactionRepository` (+ `specifications/` for filtered/paged reads).
3. Entities are mapped to response DTOs and returned; mutations trigger TanStack Query invalidation and a sonner toast via `buildMutationOptions`.

### Dashboard Aggregation

1. `useGetDashboardSummary(params)` sends `startDate`/`endDate` filters to `/api/finsight/dashboard`.
2. `DashboardController` resolves the user and calls `DashboardService.getSummary(user, start, end)`.
3. `DashboardService` runs the JPQL aggregation queries in `FinancialTransactionRepository` and assembles `DashboardSummaryDto`.
4. The SPA renders totals and recharts visualizations (`MonthlyTrendChart`, `CategorySpendingChart`).

## Code Organization

**Approach:** Layer-based on the backend, feature-based on the frontend.

**Backend module boundaries:** Single Gradle/Maven module, base package `com.lcs.finsight`; layers are separated by package (`controllers`, `services`, `repositories`, `models`, `specifications`, `dtos`, `security`, `config`, `exceptions`, `utils`). Entry point: `FinSightApplication.java`.

**Frontend module boundaries:** `@/` path alias for cross-folder imports; relative imports within a feature. Shared primitives in `components/` are purely presentational, while feature components under `features/<name>/components/` may call data hooks directly.

**Integration boundary:** The only coupling between apps is the REST contract under `/api/finsight` — backend `ApiRoutes` constants on one side, frontend axios service hooks + DTOs (`src/api/`) on the other.
