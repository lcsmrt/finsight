# Project Structure

**Root:** `/home/lcs/dev/finsight` (monorepo: `backend/` + `frontend/`)

## Directory Tree

```
finsight/
  docker-compose.yml               Production stack (finsight-api + finsight-web)
  DEPLOY.md                        Portainer deploy procedure
  backend/
    Dockerfile                     Maven build → JRE runtime image
    src/main/java/com/lcs/finsight/
      FinSightApplication.java     Spring Boot entrypoint
      config/                      OpenApiConfig, SecurityConfig
      controllers/                 REST controllers (@RestController)
      services/                    Business logic (@Service, @Transactional)
      repositories/                Spring Data JPA repositories
      models/                      JPA entities + enums
      dtos/
        request/                   Inbound request + filter DTOs
        response/                  Outbound response DTOs
      specifications/              JPA Specification query builders
      security/                    JWT filter/service, UserDetails
      exceptions/                  GlobalExceptionHandler + typed exceptions
      utils/                       ApiRoutes constants, DateUtils
  frontend/
    Dockerfile                     Vite build → nginx runtime image
    nginx.conf                     Serves the SPA, proxies /api/ to the API on the host
    src/
      api/
        clients/                   axios instance (finsightApi.ts)
        dtos/                      TS entity + request/response types
        services/                  TanStack Query service hooks (useXxxService.ts)
        types/                     QueryOptions, MutationOptions
        utils/                     buildMutationOptions, buildPagedQuery, resolve*Message
      app/
        providers/                 AppProvider, AuthProvider, TanStackQueryProvider
        routing/                   AppRouter, PrivateRoute, paths.ts
        App.tsx
      components/                  Shared UI primitives (shadcn-based) + composites
        input/base/                Field, Input, Select, Checkbox, etc.
        table/, chart/, dialog/, sheet/, popover/, ...
      features/                    Feature modules
        home/                      Main app (overview + transactions tabs)
        login/, registerUser/, notFound/
      hooks/                       Global hooks (useDebounce)
      lib/                         cn (mergeClasses), auth, storage
      utils/string/               formatters, masks
```

## Module Organization

### Backend — Layered (controller → service → repository)

**Purpose:** REST API for auth, transactions, categories, dashboard.
**Location:** `backend/src/main/java/com/lcs/finsight/`
**Key files:** `controllers/FinancialTransactionController.java`, `services/FinancialTransactionService.java`, `models/FinancialTransaction.java`, `utils/ApiRoutes.java`. Each domain has a matching Controller/Service/Repository triplet; DTOs split into `dtos/request` and `dtos/response`; dynamic filtering lives in `specifications/`.

### Frontend — Feature-oriented SPA

**Purpose:** React + TypeScript client.
**Location:** `frontend/src/`
**Key files:** `app/routing/AppRouter.tsx`, `features/home/HomePage.tsx`, `api/services/*`, `components/input/base/Field.tsx`. Cross-cutting API/UI live at `src/` top level; feature-specific code stays inside `features/<name>/`.

### Frontend API layer (global)

**Purpose:** All data access. Service hooks are global (NOT per-feature).
**Location:** `src/api/`
**Key files:** `clients/finsightApi.ts` (axios), `services/useFinancialTransactionService.ts`, `utils/buildMutationOptions.ts`, `utils/buildPagedQuery.ts`.

## Where Things Live

**Transactions:**

- UI: `frontend/src/features/home/components/transactions/` (`TransactionsTab.tsx`, `TransactionFormDrawer.tsx`, `TransactionFilterPopover.tsx`, `transactionColumns.tsx`)
- Data access (FE): `frontend/src/api/services/useFinancialTransactionService.ts`, DTOs `api/dtos/financialTransaction.ts`
- Business logic (BE): `backend/services/FinancialTransactionService.java` (incl. Nubank CSV import)
- API/Data (BE): `controllers/FinancialTransactionController.java`, `repositories/FinancialTransactionRepository.java`, `specifications/FinancialTransactionSpecification.java`, `models/FinancialTransaction.java`

**Categories:**

- UI: `frontend/src/features/home/components/transactions/` (`CategoriesManageDialog.tsx`, `CategoryFormDialog.tsx`, `CategoryCombobox.tsx`)
- Data access (FE): `api/services/useFinancialTransactionCategoryService.ts`, DTOs `api/dtos/financialTransactionCategory.ts`
- Business logic + data (BE): `services/FinancialTransactionCategoryService.java`, `controllers/FinancialTransactionCategoryController.java`, `models/FinancialTransactionCategory.java`

**Dashboard:**

- UI: `frontend/src/features/home/components/overview/` (`OverviewTab.tsx`, `SummaryCards.tsx`, `CategorySpendingChart.tsx`, `MonthlyTrendChart.tsx`)
- Data access (FE): `api/services/useDashboardService.ts`, DTOs `api/dtos/dashboard.ts`
- Business logic + data (BE): `services/DashboardService.java`, `controllers/DashboardController.java`, response DTOs `DashboardSummaryDto`, `CategoryBreakdownDto`, `MonthlyTrendDto`

**Auth:**

- UI: `frontend/src/features/login/LoginPage.tsx`, `features/registerUser/RegisterUserPage.tsx`, `app/providers/AuthProvider.tsx`, `app/routing/PrivateRoute.tsx`
- Data access (FE): `api/services/useAuthService.ts`, session in `lib/auth.ts` + `lib/storage.ts`
- Business logic + data (BE): `services/AuthenticationService.java`, `controllers/AuthenticationController.java`, `security/` (JwtService, JwtAuthenticationFilter, CustomUserDetailsService), `config/SecurityConfig.java`

**Configuration:**

- BE routes: `utils/ApiRoutes.java` (all paths under `/api/finsight`)
- FE base URL: `api/clients/finsightApi.ts` — same-origin `/api/finsight` by default; `.env.development` overrides it for the dev server

## Special Directories

**`backend/specifications/`:** JPA `Specification` builders for dynamic, filter-driven queries (e.g. `FinancialTransactionSpecification.belongsToUser`, `typeEquals`).

**`frontend/src/components/input/base/`:** Low-level form primitives (`Field`, `FieldGroup`, `FieldLabel`, `FieldError`, `Input`, `Select`) shared by all forms; each may ship a `.stories.tsx`.

**`frontend/src/api/services/`:** All TanStack Query hooks live here globally, one `useXxxService.ts` file per domain — never inside a feature folder.
