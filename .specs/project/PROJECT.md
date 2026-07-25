# finSight

**Vision:** A personal finance tracker that turns raw bank transactions into clear insight — where the money went, and where it's headed.
**For:** Individuals managing their own finances (initially the author), importing real bank data (Nubank CSV) rather than manual entry.
**Solves:** Bank apps show the past but not the future. finSight aggregates income/expenses, categorizes spending against limits, and (next) projects future cash so the user knows how much money they'll have.

## Goals

- Give a single authenticated user a trustworthy monthly view of income, expenses, and net balance from imported transactions.
- Project future spending and remaining balance from known recurring commitments (and history), so the user can plan ahead.
- Keep spending visible against per-category limits.

## Tech Stack

**Core:**

- Backend framework: Spring Boot 3.5.3
- Language: Java 17 (README says 21 — discrepancy, see CONCERNS)
- Database: PostgreSQL (schema via Hibernate `ddl-auto=update`, no migration tool)
- Frontend framework: React 19 + Vite 6 (TypeScript ~5.7)

**Key dependencies:** Spring Data JPA + Spring Security (JWT via jjwt 0.12.6); TanStack Query 5 + axios (data); recharts 2 (charts); shadcn/ui + Tailwind v4 (UI); react-hook-form + zod (forms).

## Scope

**v1 includes (already built):**

- JWT auth (register, login, profile) scoped per user
- Financial transactions: CRUD, filter/sort/paginate, Nubank CSV import with dedup
- Categories with per-category spending limits (CRUD)
- Dashboard: total income/expenses, net balance, category breakdown, monthly trend

**Next (in progress):**

- Recurring & installment transactions: register a commitment once (bounded start–end) and generate the individual future transactions, so the existing dashboard shows upcoming bills and money-left with no projection math

**Planned (later milestones):**

- Shared household — a couple tracking combined finances together, each with their own login (M4; requires the M3 schema-migration foundation). Reverses the earlier single-user-only assumption.

**Explicitly out of scope (for now):**

- Multiple bank connections or live bank APIs (import stays CSV-based)
- Investment tracking, goals/envelopes, multi-currency

## Constraints

- Technical: no DB migration tool yet (schema drift risk); no automated test coverage (backend/frontend) — both flagged in CONCERNS.md.
- Resources: solo project, worked on intermittently (being resumed after a gap).
- Process: adopting spec-driven development (this `.specs/` tree) from this point forward; monorepo root is not yet under git.
