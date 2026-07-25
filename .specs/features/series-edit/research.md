# Research — Editing recurring series: how the big players model it

**Date:** 2026-07-16
**Status:** Research spike (feature paused at Specify/Discuss). Feeds the eventual Design phase.
**Question:** Before building "edit a series", how do established products model + edit recurring series, so we don't reinvent the wheel?

---

## TL;DR

1. There are **two canonical data models**, and the industry splits by use case:
   - **Calendar model** (Google Calendar, iCalendar/RFC 5545, Outlook): a **master event + a recurrence rule (RRULE)**; individual instances are **computed on the fly** (lazy) or **hybrid-materialized** (~1yr precomputed); single-instance changes are **exception/override rows**. Occurrences are *virtual* by default.
   - **Finance/accounting model** (Actual Budget, YNAB, Stripe): a **Schedule/definition entity** that **materializes real transactions** linked back to it by FK. Occurrences are *real rows* that exist independently once created.
2. **finSight already chose the finance model** — deliberately (STATE **AD-002**: "deterministic transaction generation, not a forecast"; we generate real `FinancialTransaction` rows so the dashboard sums them). So the calendar "compute-on-read" approach is **the wrong fit**; the right analog is Actual Budget / Stripe, **plus** the calendar world's *edit UX*.
3. The **consecrated edit UX is universal**: **"This event" / "This and following" / "All events"** (Google Calendar). Everyone copies it. The clever implementation detail worth stealing: **"this and following" is a SERIES SPLIT**, not a bulk row update.
4. **What we're missing to do this cleanly is exactly the definition entity** — which validates the earlier instinct to refactor. Our `seriesId` (a bare UUID on loose rows) is a degenerate version of it.

---

## Decisions LOCKED (2026-07-16 discussion with user)

These converged during a back-and-forth and are the architectural anchor for Design. The user was explicit; treat as decided unless he reopens.

### D1 — Data model: finance (materialized) + calendar edit-UX
Keep materializing real `FinancialTransaction` rows (AD-002 stands). Introduce a first-class **`RecurrenceDefinition`** entity (the "receita"/template) that occurrences FK to. Adopt only the calendar world's **edit UX**, not its compute-on-read storage. The definition also **retires the legacy free-text `frequency`** (resolves blocker B-001).

### D2 — The series keeps ONE identity — no physical split
"A série é a série." Editing from occurrence X forward does **NOT** split the series into two objects in the user's mind. Because we materialize, **the occurrences ARE the history** (each row already holds its own amount), so we do **NOT** need the calendar's "split into two masters" trick. Model = **one definition (holds the current, forward-looking template) + occurrences as the immutable past record**. This is simpler than the calendar model and is a deliberate divergence from it (we can afford it precisely because we materialize).

### D3 — Edit scopes (Google-Calendar trio) and their semantics
- **"Só este"** — edit a single occurrence. **Already works today** (a generated occurrence is a normal transaction you `PUT`).
- **"Este e os seguintes"** — update the definition + **rewrite the future occurrences**; past rows untouched (prospective, matches Stripe/finance norm and past-is-immutable). No second object created.
- **"Todos"** — update the definition + **rewrite every occurrence, past included**. It spans the whole series naturally because the identity was never split.
- **No confirmation/warning needed.** "Todos" means todos — overwriting everything (including a prior forward-only change) is the explicit, obvious meaning of the command. (Earlier suggestion of a warning was dropped as over-engineering, per user.)

### D4 — Past is immutable by default
Edits are prospective by default ("este e os seguintes" is the 80% case). The only thing that touches the past is an explicit "Todos". No proration/reconciliation of already-created rows is needed (no money-owed semantics like Stripe).

### D5 — Open-ended (no end date) recurrence via rolling window
A no-end recurrence can't materialize infinitely. Solution = **rolling-window generation**: materialize a bounded **horizon** (e.g. ~24 months ahead) and a **background job** (or lazy on-access) slides the window forward as time passes. The definition stores **no `endDate`** + a **`generatedThrough` watermark**. Only applies to the **RECURRING** mode — **installments are inherently finite** (N parcelas) and never endless. **Not in v1** (v1 still requires an end date, AD-002), but the `RecurrenceDefinition` entity is exactly what makes it feasible later. Product note: the horizon = how far ahead the dashboard can show planned spending.

### D6 — Migration
One-time backfill: create a `RecurrenceDefinition` per existing distinct `seriesId`, infer its template from the surviving rows (amount, category, split, mode via `parcelsNumber` presence, range from min/max dates), FK the rows to it.

### The one entity ties it all together
`RecurrenceDefinition` is the single missing piece that unlocks **all three** threads: editable series (D1–D4), single logical identity (D2), and endless recurrence (D5). That convergence is the signal it's the right architectural cut.

### Still OPEN (decide in Specify/Discuss — NOT locked)
- **Installment `(k/N)` relabeling**: when "este e os seguintes" changes an installment's value/range, how are the future parcels' `k/N` labels handled? (The only genuine installment-specific subtlety.)
- **Manual single-occurrence overrides**: if a user manually edited one occurrence ("só este"), does a later "este e os seguintes" / "todos" clobber it or preserve it? User's "todos = obvious overwrite" principle leans toward *clobber*, but not explicitly confirmed for the seguintes case.
- **v1 scope**: ship all three scopes at once, or start with "este e os seguintes" + the existing single-row edit (the 80% path), deferring "todos"/endless?

---

## 1. The two models in detail

### Calendar model (RFC 5545 / Google Calendar)

Master record holds the rule; instances are derived:

- **RRULE** — the recurrence rule (`FREQ`, `INTERVAL`, `COUNT`/`UNTIL`, `BYDAY`…), one string describing the whole schedule.
- **RDATE / EXDATE** — extra dates / exception dates removed from the set.
- **RECURRENCE-ID** — identifies a *single overridden instance* within the series (the override record links back to the master by original start time).
- The **recurrence set** = expand(DTSTART + RRULE + RDATE − EXDATE), then apply overrides.

Typical schema (from public "design Google Calendar" write-ups):

```
events(id, rrule, is_recurring, parent_event_id, status, sequence_num)
recurring_pattern(id, event_id, freq, interval, byday, until, count)
event_exception(id, master_event_id, original_start, is_cancelled,
                is_rescheduled, new_start, override_title, …)
```

**Materialization strategy** — three options, with the trade-off everyone hits:
- *Compute-on-the-fly (lazy):* store only the rule, expand on every read. No bloat, infinite forward visibility, but RRULE expansion on read gets CPU-prohibitive at scale and makes range queries slow.
- *Fully materialized:* write every instance as a row. Fast reads, but "infinite" series are impossible and editing the rule means rewriting N future rows.
- *Hybrid (what Google actually does):* precompute ~1 year forward, expand-on-demand beyond. Instance IDs are **deterministic** (`master_id + original_start_utc`) so re-expansion is idempotent (safe upserts).

### Finance model (Actual Budget / YNAB / Stripe) — our analog

- **Actual Budget / YNAB:** a **Schedule** is a first-class entity (recurs indefinitely / has an end / one-off; can auto-post or ask for approval). It **creates real transactions** in the register. The schedule is the template; the posted transactions are real, reconciled rows.
- **Stripe Subscription Schedules:** the definitive "future changes to a recurring thing" model — a schedule is a list of **phases**, each with its own duration/price/terms. You **edit the schedule (future phases), not the past invoices**. Past invoices are immutable history; changes apply prospectively, with explicit **proration** rules for the in-flight period. Status lifecycle: `not_started → active → completed → released/canceled`.

**Key property of the finance model:** past occurrences are **immutable financial facts**. Nobody rewrites a paid invoice / reconciled transaction. Edits are **prospective by default** — which is exactly the "só futuras" safety instinct, and matches finSight's reality (past parcels may already be imported from the Nubank CSV, see AD-003).

---

## 2. The consecrated edit UX (steal this)

Google Calendar's three-way scope is the de-facto standard; users already understand it:

| Choice | Meaning | Canonical implementation |
| --- | --- | --- |
| **This event** | Only the selected occurrence changes | An **override/exception** — in finSight this ALREADY works: a generated occurrence is just a `FinancialTransaction` you `PUT`. |
| **This and following** | This occurrence + all future ones; **past untouched** | **SERIES SPLIT**, O(1): set `UNTIL`=day-before on the old definition, create a **new definition** from the split point with the new values, link `parent`. No per-row rewrite, no thousands of exception records. |
| **All events** | Every occurrence, past + future | Update the definition's shared fields; instances inherit on next expansion (or, when materialized, rewrite the rows). |

The **series-split** trick is the single most valuable finding: "this and following" doesn't touch existing rows at all — it *caps* the old series and *starts a new one*. Maps perfectly onto a materialized model: past rows stay, future rows are regenerated from the new segment.

---

## 3. Mapping to finSight (what this implies concretely)

Given we materialize (AD-002) and care about past/paid integrity (AD-003), the fit is **finance model + calendar edit-UX**:

- **Introduce a `RecurrenceDefinition` (a.k.a. Series) entity** holding the template: `mode` (INSTALLMENT/RECURRING), `interval`, `amount`, `description`, `category`, range (`parcelsNumber`/`startDate`/`endDate`), split template (`splitMode` + participant shares), `status`. This is what `seriesId` should have been. Occurrences FK to it.
  - Bonus: this is the natural home to **retire the legacy free-text `frequency`** (blocker **B-001**) — the enum lives on the definition; occurrences stop carrying ambiguous fragments.
- **Edit = update definition + regenerate the affected occurrences.** With the entity, "this and following" = split the definition (cap old at the pivot, spawn a new definition for the tail, regenerate only future rows). Past rows are never touched → matches "só futuras" and Stripe's prospective model.
- **"This event"** stays as-is (edit one row); optionally mark the row as **detached/overridden** on the definition so a later "all/following" edit knows not to clobber a manual override (this is the calendar `RECURRENCE-ID`/exception idea — needed only if we want override-preservation).
- **Range change** (12→18 parcels, or move end-date) becomes a definition edit that **diffs occurrences**: generate the new tail, remove future rows that fell out, re-derive the `(k/N)` labels. Much cleaner off a definition than inferring intent from loose rows.
- **We do NOT need lazy/hybrid expansion.** The calendar scaling problem (expand-on-read at 100K users) doesn't apply — we already bounded generation (`MAX_OCCURRENCES=120`) and materialize. We take the calendar *edit model*, not its *storage model*.

### Migration
Existing series (rows sharing a `seriesId`) need a one-time backfill: create a `RecurrenceDefinition` per distinct `seriesId`, infer its template from the surviving rows (amount, category, split, mode via `parcelsNumber` present, range from min/max dates), and FK the rows to it. This is the same "reconstruct template from rows" the edit feature would need anyway — doing it once as a migration is cleaner.

---

## 4. Open questions this research *resolves* vs *leaves*

**Resolves / strongly informs:**
- Edit-scope UX → adopt **this / this-and-following / all** (proven, familiar).
- "This and following" → **series split**, not bulk update (the key technique).
- Past occurrences → **immutable by default**, edits prospective (Stripe/finance consensus + our AD-003).
- Storage → **materialized + definition entity**, NOT compute-on-read (validated against AD-002).
- Legacy `frequency` → retire onto the definition (resolves B-001).

**Still needs a user decision (Discuss):**
- Do we preserve **manual single-occurrence overrides** across an "all/following" edit? (needs exception/detach tracking — calendar does; costs complexity.)
- Split behavior for **installments** specifically: does "this and following" re-label the tail as a fresh `k'/N'` count, or keep original `k/N`? (calendar splits cleanly; installments have the extra k/N semantics.)
- **Proration-like** concern: none for us (no money owed on change), but confirm changing amount mid-installment doesn't need to reconcile already-paid parcels.
- Whether v1 ships all three scopes or starts with **"this and following" only** (the 80% case) + existing single-row edit.

---

## Sources

- [RFC 5545 — iCalendar](https://datatracker.ietf.org/doc/html/rfc5545) · [RRULE (3.3.10)](https://icalendar.org/iCalendar-RFC-5545/3-3-10-recurrence-rule.html) · [EXDATE (3.8.5.1)](https://icalendar.org/iCalendar-RFC-5545/3-8-5-1-exception-date-times.html)
- [Google Calendar — "this and following" splits the series (support thread)](https://support.google.com/calendar/thread/438596322)
- [Recurring Calendar Events — Database Design (loribean, DEV)](https://dev.to/loribean/recurring-calendar-events-database-design-45c1)
- [System Design: Google Calendar (study notes — master/pattern/exception tables, hybrid materialization)](https://snowan.gitbook.io/study-notes/ai-blogs/design-google-calendar)
- [Stripe — Subscription schedules (phases, prospective edits)](https://docs.stripe.com/billing/subscriptions/subscription-schedules) · [Prorations](https://docs.stripe.com/billing/subscriptions/prorations)
- [Actual Budget — Scheduled transactions](https://actualbudget.org/docs/tour/schedules/) · [YNAB — Scheduled transactions guide](https://support.ynab.com/en_us/scheduled-transactions-a-guide-BygrAIFA9)
