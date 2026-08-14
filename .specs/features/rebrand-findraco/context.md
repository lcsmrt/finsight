# Rebrand findraco Context

**Gathered:** 2026-08-01
**Spec:** `.specs/features/rebrand-findraco/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Rename finSight → findraco across all functional surfaces, remake the theme (light + dark)
around a gold-hoard dragon identity, and replace the logo with an agent-drawn
wordmark + simple icon. Historical `.specs` docs, the DB, and the Portainer stack are
explicitly out of scope.

---

## Implementation Decisions

### Rename depth

- **Full functional rename**: UI strings, `<title>`, Java package `com.lcs.finsight` →
  `com.lcs.findraco`, API prefix `/api/finsight` → `/api/findraco`, pnpm package names
  (`findraco`, `findraco-frontend`, `findraco-backend`), Docker services/images/containers
  (`findraco-api`, `findraco-web`), env var prefix `VITE_FINSIGHT_API_URL` →
  `VITE_FINDRACO_API_URL`, living docs (READMEs, AGENTS.md, CLAUDE.md, `.specs/project/*`).
- Historical `.specs/features/*` + `.specs/codebase/*` stay untouched.
- axios client `finsightApi` → `findracoApi` (mechanical rename across ~8 importers).
- Misnamed `finsigh-icon.png` disappears with the old logo.

### Theme direction: Gold hoard

- **Dark**: amber/gold primary on deep charcoal-navy background (treasure-pile vibe).
- **Light**: warm parchment background with the same gold identity.
- Class strategy (`.dark`) — `dark:` variants already half-wired in components.
- Theme toggle in the navbar; `prefers-color-scheme` default; localStorage persistence.

### Logo: wordmark + simple icon

- Stylized lowercase "findraco" wordmark with a minimal dragon-wing or coin accent,
  drawn by the agent as SVG. Safest, least mascot-forward option — chosen by user.
- Favicon: proper generated icon set from the SVG mark.

### 404 and easter eggs

- **Plain 404**: themed, no mascot gag. Bingus (`bingus.webp`) removed from the 404 page;
  unused `happy-cat-happy-happy-happy.gif` deleted.

### Agent's Discretion

- Exact oklch token values for both palettes (within the gold-hoard direction).
- Exact wordmark letterforms and the wing/coin accent shape.
- Toggle UI details (icon choice, placement within navbar).

---

## Specific References

- Brand metaphor: dragon "hoarding" — users hoard and guard their treasure (money).
- Name: **findraco** — always lowercase in the wordmark (agent's discretion in prose:
  "findraco" to match the wordmark).

---

## Deferred Ideas

- Real commissioned dragon mascot artwork (could replace the simple icon later).
- Renaming the local repo dir / GitHub repo — user's manual step.
- Portainer env var rename (`VITE_FINDRACO_API_URL`) — deploy-time checklist item.
