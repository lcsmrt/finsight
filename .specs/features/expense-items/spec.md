# Transaction Line Items ("Expense Items") Specification

> Roadmap name: **Expense items** (AD-004, deferred after Shared Plans). Scope broadened during Specify
> (2026-07-14) to cover **all** transactions, not only expenses — so the entity is named generically
> `TransactionItem`, while the feature folder stays `expense-items` to match existing references.

## Problem Statement

A single transaction often bundles things that belong to **different categories** — an online cart with a
gift, something for the house, and something personal; or a grocery run mixing food and cleaning supplies.
Today a transaction carries exactly one category, so the user cannot answer questions like _"how much of my
grocery spending is cleaning supplies vs. actual food?"_. The unit of category truth is too coarse.

This feature lets a transaction be broken into **line items**, each with its own category and amount, so the
dashboard's category breakdown reflects what was **actually** bought — without forcing the user to itemize
things they don't care about (taxes, freight, the boring remainder).

## Goals

- [ ] A transaction can be decomposed into 0..N line items, each with a description, an amount, and an
      optional category — as an **additive** child of `FinancialTransaction` (existing transactions and the
      existing flows are unaffected when no items are present).
- [ ] The dashboard **category breakdown** and **per-category limit evaluation** attribute spending at the
      item level: each item's amount counts under its own category; the un-itemized remainder counts under the
      parent transaction's category. **Top-line totals (income/expense/net) are unchanged.**
- [ ] Answer the driving question: _cleaning vs. food within one grocery run_, from the existing dashboard.

## The Partition Invariant (core rule)

A transaction's `amount` is partitioned **exactly once** across category buckets:

```
amount  =  Σ (categorized item amounts, by item category)
         +  Σ (uncategorized item amounts)   → parent transaction's category
         +  remainder (amount − Σ items)      → parent transaction's category
```

- Items may sum to **less** than the total (loose); the remainder lands on the parent category.
- Items may **not** sum to more than the total (`0 ≤ Σitems ≤ amount`).
- An **uncategorized** item behaves like remainder — it falls to the parent transaction's category.
- If the parent transaction itself has **no** category, its remainder/uncategorized-item portion is reported
  as **Uncategorized**.
- The slices always sum back to `amount` ⇒ **no double-counting; top-line totals never move.**
- A transaction with **no** items behaves exactly as today (full `amount` → its own category).

## Out of Scope

| Feature | Reason |
| --- | --- |
| Item-level attribution to **people** (which person owes which item) | User decided items and participants are **independent axes** (2026-07-14). Split/`participants`/`shareAmount` are untouched; itemized splitting is a possible future feature. |
| Strict "items must equal total" validation | Loose chosen deliberately; remainder has a defined home. |
| Deriving line items from **Nubank CSV import** | The CSV has no line-item data; imported transactions simply have no items. |
| A brand-new standalone "spending by item" report/screen | The value is delivered through the **existing** dashboard breakdown; a dedicated report is a future nice-to-have. |
| PATCH / partial item edits | Consistent with the transaction update contract — PUT is full-replace (see STATE transaction-update-contract). Items are reconciled on full-body update. |

---

## User Stories

### P1: Record categorized line items on a transaction ⭐ MVP

**User Story**: As a plan member, I want to break a transaction into line items — each with a description,
an amount, and (optionally) its own category — so that one purchase can span multiple categories.

**Why P1**: This is the data foundation; nothing else works without it.

**Acceptance Criteria**:

1. WHEN a user creates or edits a transaction with an `items` list THEN the system SHALL persist each item as
   a child of that transaction (description required, amount required and `> 0`, category optional).
2. WHEN a transaction is fetched THEN the response SHALL include its `items` (with each item's id, description,
   amount, and category).
3. WHEN a transaction is updated with a new `items` list THEN the system SHALL **reconcile** items
   (add new, update kept, remove dropped) as a full-replace of the item set — mirroring the
   `applyParticipants` reconcile-by-key contract.
4. WHEN the sum of item amounts exceeds the transaction `amount` THEN the system SHALL reject the request with
   a validation error (`items cannot exceed the transaction total`).
5. WHEN an item amount is `≤ 0` or its description is blank THEN the system SHALL reject the request.
6. WHEN an item carries a `categoryId` whose **type** does not match the transaction's type (a CREDIT category
   on a DEBIT transaction, or vice-versa) THEN the system SHALL reject the request.
7. WHEN the parent transaction is deleted THEN its items SHALL be removed with it (cascade / orphan removal).
8. WHEN a user without permission to modify the transaction attempts to change its items THEN the system SHALL
   deny it (item edits reuse the existing transaction-modify authorization — row-owner / Editor / Owner).

**Independent Test**: Create a DEBIT transaction of 150 with items `[{food,90,Food},{cleaning,40,Cleaning}]`,
GET it back and see two items + a 20 remainder implied; update it removing one item and see it reconciled;
attempt a 3rd item of 100 (Σ=230 > 150) and get a validation error.

---

### P1: Item-aware category breakdown & limits ⭐ MVP

**User Story**: As a plan member, I want the dashboard's category breakdown and per-category limits to reflect
my **item** categories, so I can finally see cleaning vs. food inside one grocery run.

**Why P1**: This is the actual payoff — the reason to itemize at all.

**Acceptance Criteria**:

1. WHEN the dashboard category breakdown is computed THEN each categorized item's amount SHALL count under its
   **own** category, per the Partition Invariant.
2. WHEN a transaction has a remainder (or uncategorized items) THEN that portion SHALL count under the parent
   transaction's category (or **Uncategorized** if the parent has none).
3. WHEN per-category spending-limit evaluation (PLAN-07) runs THEN it SHALL use the **same** item-aware
   attribution as the breakdown.
4. WHEN totals (income / expense / net balance) are computed THEN they SHALL be **identical** to today —
   itemization only changes the category distribution, never the totals.
5. WHEN a transaction has no items THEN its full amount SHALL count under its own category exactly as before
   (no behavioral change for existing data).

**Independent Test**: With one 150 grocery transaction itemized food 90 / cleaning 40, the breakdown shows
Food +90, Cleaning +40, Groceries +20; the expense total is still 150; deleting the items reverts the
breakdown to Groceries +150.

---

### P1: Manage line items in the transaction form

**User Story**: As a user, I want a repeatable "items" section in the transaction create/edit drawer so I can
add, edit, and remove line items with a live view of the remaining (un-itemized) amount.

**Why P1**: Without entry UI the feature is not usable end-to-end (vertical slice).

**Acceptance Criteria**:

1. WHEN a user opens the transaction form THEN they SHALL be able to add rows of {description, amount,
   category}, and remove rows.
2. WHEN item amounts are entered THEN the form SHALL show the running remainder (`amount − Σitems`) and SHALL
   block submit when `Σitems > amount` (client-side), matching the server rule.
3. WHEN editing an existing transaction THEN its current items SHALL be pre-loaded into the form.
4. WHEN the category options are shown for an item THEN they SHALL be the **same plan categories** used for the
   transaction, filtered to the transaction's current type.

**Independent Test**: Open the drawer, add two categorized items under a 150 total, watch remainder show 20,
save, reopen and see the two items; add an item pushing Σ over 150 and see submit blocked.

---

### P2: Quantity per item

**User Story**: As a user, I want an optional quantity on an item (e.g. `3 × milk`) so repeated buys read
naturally; the item's `amount` remains the line total.

**Why P2**: Convenience/readability; not required to answer the category question.

**Acceptance Criteria**:

1. WHEN a quantity is provided THEN it SHALL default to 1, be a positive integer, and be stored/returned on the
   item. Amount stays the line total (no auto-multiplication in v1).

---

### P2: See which transactions are itemized

**User Story**: As a user, I want the transactions table to indicate itemized transactions and let me view
their items, so I can tell at a glance which rows carry detail.

**Why P2**: Discoverability; the data and dashboard value already work without it.

**Acceptance Criteria**:

1. WHEN a transaction has items THEN the table SHALL show an indicator (e.g. an item count) and allow viewing
   the items (expand/detail).

---

### P3: Items replicated across a generated series

**User Story**: As a user, when I create a recurring/installment series with items, I want each generated
occurrence to carry the same items, mirroring how participants replicate per occurrence.

**Why P3**: Series + items is an advanced combination; single-transaction itemization delivers the core value.
If unbuilt, a series simply generates item-less occurrences.

**Acceptance Criteria**:

1. WHEN a series is generated from a definition that includes items THEN each occurrence SHALL be stamped with
   a copy of those items (per-occurrence, like `participants`).

---

## Edge Cases

- WHEN `Σitems == amount` exactly THEN remainder is 0 and the parent category contributes nothing (fully
  itemized) — allowed.
- WHEN the transaction `amount` is **inline-edited** (table cell) to a value **below** the current `Σitems`
  THEN the system SHALL reject it (would create a negative remainder) — ties into the full-body inline update
  contract; the inline amount edit must send/keep the items and be validated.
- WHEN two items reference the **same** category THEN both contribute to that category (no dedupe/merge
  required) — allowed.
- WHEN an item's `categoryId` points to a category **not in this plan** (or soft-deleted) THEN reject.
- WHEN a transaction has items and its **type** is changed (DEBIT↔CREDIT) on edit THEN all item categories must
  still type-match, else reject (surfaced in the form before submit).
- WHEN a very large number of items is submitted THEN a sane per-transaction cap MAY apply (define in design;
  soft limit, not a hard requirement).

---

## Requirement Traceability

| Requirement ID | Story | Task(s) | Status |
| --- | --- | --- | --- |
| ITEM-01 | P1: Record line items (persist child, description/amount/category, `>0`) | T1,T2,T3,T4,T5 | In Tasks |
| ITEM-02 | P1: Loose sum rule — `0 ≤ Σitems ≤ amount`, reject overflow | T3,T5,T10 | In Tasks |
| ITEM-03 | P1: Reconcile items on full-body update (mirror `applyParticipants`) | T5 | In Tasks |
| ITEM-04 | P1: Item category type must match transaction type | T5 | In Tasks |
| ITEM-05 | P1: Item edits reuse transaction-modify authorization | T5 | In Tasks |
| ITEM-06 | P1: Cascade/orphan-removal of items with the transaction | T1,T2 | In Tasks |
| ITEM-07 | P1: Item-aware dashboard category breakdown (Partition Invariant) | T6,T7,T8 | In Tasks |
| ITEM-08 | P1: Item-aware per-category limit evaluation (PLAN-07) | T7,T8 | In Tasks |
| ITEM-09 | P1: Top-line totals unchanged by itemization | T8,T14 | In Tasks |
| ITEM-10 | P1: Transaction form repeatable items section + live remainder + client sum guard | T9,T10 | In Tasks |
| ITEM-11 | P1: Items available on both CREDIT and DEBIT transactions | T10 | In Tasks |
| ITEM-12 | P2: Optional quantity per item (default 1, positive int, amount = line total) | T1,T11 | In Tasks |
| ITEM-13 | P2: Transactions table itemized indicator + view items | T12 | In Tasks |
| ITEM-14 | P3: Items replicated across a generated series | T13 | In Tasks |

**ID format:** `ITEM-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 14 total, **14 mapped to tasks** (T1–T14); 0 unmapped. Execute pending (P1 = T1–T10 first pass).

---

## Success Criteria

- [ ] A user can itemize one transaction across ≥2 categories and see those categories reflected in the
      dashboard breakdown, while the expense total is unchanged.
- [ ] Non-itemized transactions and all existing flows behave identically to before (zero regression).
- [ ] `Σitems > amount` is impossible to persist (server-enforced; form-guarded).
- [ ] The driving question — cleaning vs. food in one grocery run — is answerable from the existing dashboard.
</content>
</invoke>
