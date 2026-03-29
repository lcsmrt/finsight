# finSight Frontend

React + TypeScript SPA for personal finance management.

## Tech Stack

- **React 18** + **TypeScript** — UI and type safety
- **Vite** — build tool and dev server
- **TanStack Query** — server state management and caching
- **React Hook Form** + **Zod** — form handling and validation
- **Tailwind CSS** + **shadcn/ui** — styling and UI primitives
- **Recharts** — charts and data visualization
- **Storybook** — component development and documentation
- **React Router** — client-side routing

## Features

- JWT authentication (login, register, protected routes)
- Transaction management: create, edit, duplicate, delete with inline table editing
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

```bash
npm install
npm run dev
```

Storybook:
```bash
npm run storybook
```

## Environment

Copy `.env.example` to `.env` and set the API base URL:

```
VITE_API_BASE_URL=http://localhost:8080
```

## Backend

See [finSight Backend](../finSight-backend) for the Spring Boot API that powers this application.
