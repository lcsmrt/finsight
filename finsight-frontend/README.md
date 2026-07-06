# finSight Frontend

React + TypeScript SPA for personal finance management.

## Tech Stack

- **React 19** + **TypeScript** — UI and type safety
- **Vite 6** — build tool and dev server
- **TanStack Query** — server state management and caching
- **React Hook Form** + **Zod** — form handling and validation
- **Tailwind CSS v4** + **shadcn/ui** (base-ui) — styling and UI primitives
- **Recharts** — charts and data visualization
- **Storybook** + **Vitest** — component development and story-based tests
- **React Router 7** — client-side routing

## Features

- JWT authentication (login, register, protected routes)
- Transaction management: create, edit, duplicate, delete with inline table editing
- **Recurring & installment transactions** — a "Repetir/Parcelar" section in the transaction form generates a whole series (N parcels or a bounded monthly recurrence); series rows are badged and a series can be deleted in one action
- Category management with spending limits
- Nubank CSV import
- Dashboard with monthly trend chart and category spending breakdown
- Filtering, sorting, and pagination on all lists

## Project Structure

```
src/
  api/          HTTP client, DTOs, TanStack Query service hooks, shared API utilities
  app/          App bootstrap (providers, router, App.tsx)
  components/   Shared UI primitives and composites (reused across 2+ features)
  features/     Feature modules (pages, components, hooks — feature-specific)
  hooks/        Global reusable hooks
  lib/          Shared logic (cn, auth, storage)
  utils/        Pure utility functions (formatters, masks)
```

## Getting Started

### Prerequisites

- **Node.js** (project uses Vite 6 / React 19)
- The [finSight Backend](../finsight-backend) running locally on port **3000**

### Run locally

```bash
npm install
npm run dev
```

The dev server reads `.env.development` (already committed), which points at the local backend:

```
VITE_FINSIGHT_API_URL=http://localhost:3000/api/finsight
```

No extra env setup is needed for local development — just make sure the backend is up first. (Production build uses `.env.production`.)

### Other commands

```bash
npm run build       # type-check (tsc -b) + production build
npm run lint        # eslint
npm run storybook   # component workshop on :6006
npx vitest run      # run story-based tests (headless Chromium)
```

## Trying the recurring feature

1. Log in, open the **Transactions** tab, click to create a transaction.
2. Enable **"Repetir/Parcelar"**, choose **Parcelado** (enter number of parcels) or **Recorrente** (pick an end date), and save.
3. The generated transactions appear across the corresponding months (badged as a series) and are reflected in the **Overview** dashboard for those months.
4. Delete the whole series with the series action on any of its rows, or delete a single occurrence with the normal delete.

## Conventions & Spec-Driven Development

Component/form/API conventions are documented in [`CLAUDE.md`](./CLAUDE.md) and the `/component-creation`, `/form-creation`, `/api-integration` skills. Feature specs live in [`../.specs/`](../.specs).

## Backend

See [finSight Backend](../finsight-backend) for the Spring Boot API that powers this application.
