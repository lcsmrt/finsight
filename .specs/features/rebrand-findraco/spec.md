# Rebrand: finSight → findraco Specification

## Problem Statement

The app is being renamed from **finSight** to **findraco**, with a new brand identity
built around a dragon mascot and the dragon "hoarding" metaphor (users hoard and track
their treasure — money). The current brand (crimson/pink palette, pixel-art "FS" logo,
dark-only theme) no longer matches the product vision.

## Goals

- [ ] Every functional reference to "finSight" renamed to "findraco" (UI, code identifiers, API prefix, package names, Docker names, env vars, living docs) — zero remaining occurrences outside historical records
- [ ] New gold-hoard visual identity: light + dark themes defined and switchable in the UI
- [ ] New wordmark + icon logo replacing all current logo/favicon assets

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Rewriting historical `.specs/features/*` and `.specs/codebase/*` docs | They are dated records of past work; only living docs (README, AGENTS.md, CLAUDE.md, STATE.md, PROJECT.md) get renamed |
| Renaming the local repo directory (`~/dev/finsight`) or GitHub repo | Outside the codebase; user's manual step |
| Renaming the PostgreSQL database itself | Lives outside the repo (env var value, not code) |
| Portainer stack/env updates | Applied on the VPS at deploy time; documented as a deploy checklist, not code |
| Commissioned mascot artwork | User chose an agent-drawn wordmark + simple icon |
| PWA manifest / app icons beyond favicon | No manifest exists today |

---

## User Stories

### P1: Full functional rename ⭐ MVP

**User Story**: As the product owner, I want every functional reference to say "findraco" so that the brand is consistent for users, in code, and in deployment.

**Why P1**: A half-renamed product (findraco UI hitting `/api/finsight`) is confusing and unfinished.

**Acceptance Criteria**:

1. WHEN a user opens the app THEN the browser title, logos, alt texts, and every visible string SHALL say "findraco" — no "finSight" anywhere user-visible
2. WHEN the backend serves any endpoint THEN the route prefix SHALL be `/api/findraco` and the Java package SHALL be `com.lcs.findraco`, with all tests passing
3. WHEN the frontend calls the API THEN it SHALL use `VITE_FINDRACO_API_URL` with `/api/findraco` fallback, and nginx SHALL proxy `/api/findraco/` to the API
4. WHEN someone builds the Docker stack THEN services/images/containers SHALL be named `findraco-*` and pnpm workspace packages `findraco` / `findraco-frontend` / `findraco-backend`
5. WHEN a developer reads living docs (READMEs, AGENTS.md, CLAUDE.md, `.specs/project/*`) THEN they SHALL see "findraco"

**Independent Test**: `grep -ri "finsight" --exclude-dir={.git,node_modules,target,dist,.specs} .` returns nothing; backend `./mvnw test` passes; frontend `pnpm build && pnpm test` passes.

---

### P1: Gold-hoard theme, light + dark ⭐ MVP

**User Story**: As a user, I want a warm gold-on-dark theme and a parchment light theme with a way to switch, so the app feels like a dragon's hoard in any lighting.

**Why P1**: The theme IS the rebrand; today only a dark theme exists, so the light theme must be created.

**Acceptance Criteria**:

1. WHEN the app loads THEN the dark theme SHALL show amber/gold primary on deep charcoal-navy, and the light theme SHALL show warm parchment background with the same gold identity
2. WHEN the user toggles the theme THEN all components (shadcn primitives, charts, sidebar/navbar, forms) SHALL render correctly in both modes via a `.dark` class strategy
3. WHEN no preference is stored THEN the theme SHALL follow `prefers-color-scheme`; a manual choice SHALL persist in localStorage and win on subsequent visits
4. WHEN semantic tokens are inspected THEN only theme-aware tokens change between modes; `dark:` variant classes in components SHALL continue to work

**Independent Test**: Open the app, toggle light/dark in the navbar, verify every page (login, dashboard, transactions, categories) renders legibly in both; reload and confirm persistence.

---

### P1: New logo: wordmark + simple icon ⭐ MVP

**User Story**: As a user, I want to see the new findraco wordmark and dragon icon so I recognize the brand.

**Why P1**: Logo is the most visible brand element; replaces the pixel-art FS everywhere.

**Acceptance Criteria**:

1. WHEN the app renders the navbar, login, and register pages THEN they SHALL show the new wordmark SVG (stylized "findraco" + minimal dragon/coin accent)
2. WHEN the browser shows a tab THEN the favicon SHALL be the new dragon icon (proper `.ico`/PNG set, not a misnamed oversized PNG)
3. WHEN the old assets are checked THEN `favicon.ico` (misnamed PNG), `finsigh-icon.png` (typo'd filename), and the cat GIF SHALL be deleted; Bingus 404 SHALL be replaced with a plain themed 404

**Independent Test**: Visual check of navbar/login/register/404 + browser tab icon.

---

## Edge Cases

- WHEN a returning user has an old auth token in localStorage THEN the token SHALL still work (rename does not touch JWT claims/secret)
- WHEN an old frontend bundle (cached) calls `/api/finsight` after deploy THEN it SHALL break — acceptable: nginx stops proxying the old prefix; redeploy ships both together
- WHEN `VITE_FINDRACO_API_URL` is unset THEN the client SHALL fall back to same-origin `/api/findraco` (current behavior preserved)
- WHEN Java package is renamed THEN `pom.xml` (artifactId, JaCoCo includes), `application.properties` (`spring.application.name`), and all test sources SHALL move consistently

---

## Requirement Traceability

| Requirement ID | Story                    | Phase | Status  |
| -------------- | ------------------------ | ----- | ------- |
| BRD-01         | P1: Rename — user-facing | -     | Pending |
| BRD-02         | P1: Rename — backend code/API | - | Pending |
| BRD-03         | P1: Rename — frontend code/env | - | Pending |
| BRD-04         | P1: Rename — Docker/deploy/docs | - | Pending |
| BRD-05         | P1: Dark theme remake    | -     | Pending |
| BRD-06         | P1: Light theme creation | -     | Pending |
| BRD-07         | P1: Theme toggle + persistence | - | Pending |
| BRD-08         | P1: Wordmark + icon assets | -   | Pending |
| BRD-09         | P1: Favicon + asset cleanup, plain 404 | - | Pending |

**Coverage:** 9 total, 0 mapped to tasks, 9 unmapped ⚠️ (pre-tasks phase)

---

## Success Criteria

- [ ] Zero "finsight" occurrences outside `.specs/features/` historical docs
- [ ] `./mvnw test` green, `pnpm build` + `pnpm test` green
- [ ] Both themes verified on every page via manual UAT
- [ ] Deploy checklist for Portainer (env rename) written into the handoff
