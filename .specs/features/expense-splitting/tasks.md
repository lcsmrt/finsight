# Expense Splitting & Attribution — Tasks

**Design**: `./design.md`
**Spec**: `./spec.md`
**Status**: All 13 tasks complete, E2E-verified 2026-07-13

> **SPEC_DEVIATION (2026-07-12, pre-T1)**: migration renumbered **V5 → V6**. `V5__translate_default_plan_names.sql` landed on `main` after design.md/tasks.md were written (backend now at V5, clean, 17 commits ahead of origin). All references below to `V5__add_transaction_participants.sql` mean `V6__add_transaction_participants.sql`.

> **Testing note (herdado de Shared Plans / TESTING.md).** Sem infra de teste de integração ou E2E; até o stub `@SpringBootTest` exige DB. Precedente do projeto: **lógica pura recebe testes unitários reais**; tudo DB/HTTP-bound é **compile-gated** + verificado em runtime na task final de E2E (os dois apps de pé). Gates:
> - Backend compile: `cd finsight-backend && ./mvnw -q -DskipTests package` (compila sem DB)
> - Backend unit: `./mvnw test -Dtest=<NomeDoTest>`
> - Frontend: `cd finsight-frontend && npm run lint && npm run build` (baseline de lint pré-existente — não regredir; não precisa zerar)
> - Boot/migration verify: subir o app com Flyway contra **cópia** do dev DB (`SERVER_PORT=3099`), Hibernate `validate` deve passar

---

## Execution Plan

### Phase 1 — Data foundation (Sequential)
```
T1 → T2
```

### Phase 2 — Building blocks (Parallel após T2)
```
        ┌→ T3 [P] (SplitResolver + unit)
        ├→ T4 [P] (PlanAuthorization + unit)
T2 ──────┼→ T5 [P] (request DTOs)
        ├→ T8 [P] (PLAN-08 query)
        └→ T9 [P] (response DTO)
```

### Phase 3 — Write-side integration (Sequential)
```
T3,T4,T5 → T6 → T7
```

### Phase 4 — Frontend (Sequential, pode começar assim que T9 fecha)
```
T9 → T10 → T11 → T12
```

### Phase 5 — Verify (Sequential)
```
T6,T7,T8,T11,T12 → T13
```

---

## Task Breakdown

### T1: Migration V5 — tabela de participações + split_mode + backfill
**What**: Migration Flyway aditiva que cria `transaction_participants`, adiciona `split_mode` em `financial_transactions`, índices, e faz backfill de 1 participação 100% por transação existente.
**Where**: `finsight-backend/src/main/resources/db/migration/V5__add_transaction_participants.sql`
**Depends on**: None
**Reuses**: Padrão das migrations V2–V4 (DDL + backfill idempotente)
**Requirement**: SPLIT-01
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Cria `transaction_participants {id, transaction_id FK→financial_transactions ON DELETE CASCADE, member_user_id FK→users, share_amount NUMERIC(19,2) NOT NULL}` + `UNIQUE(transaction_id, member_user_id)` + índices `idx_txn_participants_txn`/`_member`
- [ ] `ALTER TABLE financial_transactions ADD COLUMN split_mode VARCHAR(16) NOT NULL DEFAULT 'EQUAL'`
- [ ] Backfill `INSERT ... SELECT id, created_by, amount FROM financial_transactions`
- [ ] SQL revisado; sem statement destrutivo
**Tests**: none · **Gate**: build (SQL não compila; boot-verify em T2)
**Commit**: `feat(split): V6 migration for transaction participants + backfill` — ✅ `a0a5c39`

---

### T2: Entidade TransactionParticipant + SplitMode + mapeamento em FinancialTransaction
**What**: `SplitMode` enum, entidade `TransactionParticipant`, e `@OneToMany(cascade=ALL, orphanRemoval=true)` + `splitMode` em `FinancialTransaction`. Boot-verify contra cópia do dev DB.
**Where**: `models/SplitMode.java`, `models/TransactionParticipant.java`, `models/FinancialTransaction.java` (modificar)
**Depends on**: T1
**Reuses**: Estilo das entidades existentes (sem Lombok, FKs como em `FinancialTransaction.plan`/`createdBy`)
**Requirement**: SPLIT-01
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `enum SplitMode { EQUAL, EXACT, PERCENT }`
- [ ] `TransactionParticipant` mapeia tabela T1 (`transaction`, `member`, `shareAmount`) com getters/setters
- [ ] `FinancialTransaction` ganha `List<TransactionParticipant> participants` + `SplitMode splitMode` (getters/setters); `created_by`/`plan`/`amount` intactos
- [ ] **Boot-verify**: app sobe com Flyway aplicando v5 e Hibernate `validate` passa contra cópia do dev DB (`SERVER_PORT=3099`)
- [ ] Gate: `./mvnw -q -DskipTests package`
**Tests**: none · **Gate**: build + boot-verify
**Commit**: `feat(split): TransactionParticipant entity + splitMode on FinancialTransaction`

---

### T3: SplitResolver (lógica pura) + testes unitários [P]
**What**: Componente puro que resolve `(amount, mode, inputs)` → cotas com soma **exata** = amount. MVP: EQUAL, EXACT; PERCENT rejeitado.
**Where**: `services/SplitResolver.java` + `src/test/java/.../SplitResolverTest.java`
**Depends on**: T2
**Reuses**: Idioma `BigDecimal`/`RoundingMode.HALF_UP` (como `CategoryBreakdownDto`); estilo de teste de `RecurringTransactionGeneratorTest`
**Requirement**: SPLIT-02
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `resolve(BigDecimal amount, SplitMode mode, List<ParticipantInput>)` → `List<ResolvedShare>` com `SUM == amount`
- [ ] EQUAL distribui o centavo residual de forma determinística (ex.: 100,00/3 → 33,34/33,33/33,33)
- [ ] EXACT valida soma == amount (senão `IllegalArgumentException`)
- [ ] PERCENT lança `IllegalArgumentException("PERCENT not yet supported")`
- [ ] Testes cobrem: EQUAL par/ímpar com resíduo, EXACT ok, EXACT soma≠total, PERCENT rejeitado, participante único (100%)
- [ ] Gate: `./mvnw test -Dtest=SplitResolverTest` — todos verdes
**Tests**: unit · **Gate**: `./mvnw test -Dtest=SplitResolverTest`
**Commit**: `feat(split): pure SplitResolver with EQUAL/EXACT modes + unit tests` — ✅ `7cf4003` (6/6 tests)

---

### T4: PlanAuthorization.requireCanAttributeToOthers + testes [P]
**What**: Novo guarda: OWNER/EDITOR podem atribuir a terceiros; CONTRIBUTOR/VIEWER não. Estende os testes unitários existentes.
**Where**: `security/PlanAuthorization.java` (modificar) + `src/test/java/.../PlanAuthorizationTest.java` (estender)
**Depends on**: None (usa `PlanRole` pré-existente)
**Reuses**: Padrão throw-on-deny dos `requireXxx` (`PlanAuthorization.java:17-58`); suíte `PlanAuthorizationTest` (20 testes)
**Requirement**: SPLIT-03
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `void requireCanAttributeToOthers(PlanRole role)` — permite OWNER/EDITOR; lança `InsufficientPlanRoleException` p/ CONTRIBUTOR e VIEWER
- [ ] Testes p/ os 4 papéis (2 allow, 2 deny)
- [ ] Gate: `./mvnw test -Dtest=PlanAuthorizationTest` — contagem ≥ 24 verdes (20 antigos + novos, sem deleções silenciosas)
**Tests**: unit · **Gate**: `./mvnw test -Dtest=PlanAuthorizationTest`
**Commit**: `feat(split): authorization guard for attributing to other members`

---

### T5: Request DTOs aceitam participants + splitMode [P]
**What**: `FinancialTransactionRequestDto` e `FinancialTransactionSeriesRequestDto` ganham `splitMode` e `participants: List<ParticipantInputDto>`; novo `ParticipantInputDto {memberId, shareAmount}`.
**Where**: `dtos/request/FinancialTransactionRequestDto.java`, `dtos/request/FinancialTransactionSeriesRequestDto.java` (modificar), `dtos/request/ParticipantInputDto.java` (novo)
**Depends on**: T2 (tipo `SplitMode`)
**Reuses**: Bean Validation já usado nos DTOs (`@NotNull` etc.)
**Requirement**: SPLIT-02, SPLIT-06
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `ParticipantInputDto` com `memberId` (`@NotNull`) e `shareAmount` opcional (usado só em EXACT)
- [ ] Ambos os request DTOs expõem `splitMode` (opcional) e `participants` (opcional) com getters
- [ ] Gate: `./mvnw -q -DskipTests package`
**Tests**: none · **Gate**: build
**Commit**: `feat(split): request DTOs accept participants + splitMode`

---

### T6: FinancialTransactionService — applyParticipants em create/update
**What**: Helper `applyParticipants(txn, dto, ctx)` que default→100% self, valida membership/duplicados, resolve via SplitResolver, aplica guarda de rateio, e substitui as participações. Fiado em `create` e `update`.
**Where**: `services/FinancialTransactionService.java` (modificar)
**Depends on**: T3, T4, T5
**Reuses**: `PlanAuthorization`, `SplitResolver` (T3), `PlanMembershipRepository` (validar membership), `ctx.getUser()/getPlan()/getRole()`
**Requirement**: SPLIT-02, SPLIT-03
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Injeta `SplitResolver` + `PlanMembershipRepository`
- [ ] `participants` vazio/nulo ⇒ `[{ctx.getUser(), amount}]`, `splitMode=EQUAL`
- [ ] Valida cada `memberId` é membro do plano (senão 400/403); rejeita duplicados
- [ ] Se resultado ≠ "100% para `ctx.getUser()`" ⇒ `requireCanAttributeToOthers(ctx.getRole())`
- [ ] Invariante `SUM(share_amount) == amount` garantida pela resolução (EXACT validado)
- [ ] `create` (`:96`) e `update` (`:124`) chamam o helper; `update` substitui participações (orphanRemoval); `created_by`/`plan` imutáveis
- [ ] Gate: `./mvnw -q -DskipTests package`
**Tests**: none (DB-bound → E2E em T13) · **Gate**: build
**Commit**: `feat(split): resolve and persist participants on create/update`

---

### T7: Recorrentes carimbam participações
**What**: `createSeries` resolve o template de participações uma vez; `RecurringTransactionGenerator.baseTransaction` cria uma `TransactionParticipant` por membro em cada ocorrência. Estende os testes unitários do gerador.
**Where**: `services/FinancialTransactionService.java` (`createSeries` :158), `services/RecurringTransactionGenerator.java` (modificar) + `RecurringTransactionGeneratorTest` (estender)
**Depends on**: T6
**Reuses**: Loop atual do gerador (`:30-67`); resolução de T3; padrão do helper de T6
**Requirement**: SPLIT-04
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `generate(...)` recebe o template resolvido e cada ocorrência recebe suas participações (mesmo `share_amount` por ocorrência)
- [ ] Participações omitidas ⇒ 100% self por ocorrência
- [ ] Guarda de rateio (T4) aplicada na criação da série
- [ ] Testes do gerador cobrem participações replicadas nas ocorrências (INSTALLMENT + RECURRING)
- [ ] Gate: `./mvnw test -Dtest=RecurringTransactionGeneratorTest` — contagem ≥ 8 verdes (sem deleções)
**Tests**: unit · **Gate**: `./mvnw test -Dtest=RecurringTransactionGeneratorTest`
**Commit**: `feat(split): stamp participants on each recurring occurrence`

---

### T8: Repontar PLAN-08 — findPersonBreakdown por participante [P]
**What**: Novo JPQL de `findPersonBreakdown` fazendo `JOIN ft.participants` e somando `share_amount` agrupado por participante. `buildPersonBreakdown` fica inalterado.
**Where**: `repositories/FinancialTransactionRepository.java` (modificar `:60-68`)
**Depends on**: T2
**Reuses**: `DashboardService.buildPersonBreakdown` (`:103`) — mesmas posições `(id, name, type, sum)`, sem mudança
**Requirement**: SPLIT-05
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] JPQL: `SELECT tp.member.id, tp.member.name, ft.type, COALESCE(SUM(tp.shareAmount),0) FROM FinancialTransaction ft JOIN ft.participants tp WHERE ft.plan=:plan AND ft.startDate BETWEEN ... GROUP BY tp.member.id, tp.member.name, ft.type`
- [ ] `buildPersonBreakdown` não muda
- [ ] Gate: `./mvnw -q -DskipTests package`
**Tests**: none (DB-bound → E2E em T13, AC de consistência de totais) · **Gate**: build
**Commit**: `refactor(split): person breakdown sums participant shares (PLAN-08)`

---

### T9: Response DTO expõe participants + splitMode [P]
**What**: `FinancialTransactionResponseDto` ganha `participants: List<ParticipantDto>` e `splitMode`. `CreatedByDto` mantido.
**Where**: `dtos/response/FinancialTransactionResponseDto.java` (modificar)
**Depends on**: T2
**Reuses**: Padrão do `CreatedByDto` aninhado (`:41-57`)
**Requirement**: SPLIT-06
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `ParticipantDto {id, name, shareAmount}` aninhado, construído de `transaction.getParticipants()`
- [ ] Campos `participants` + `splitMode` no response com getters
- [ ] Gate: `./mvnw -q -DskipTests package`
**Tests**: none · **Gate**: build
**Commit**: `feat(split): response DTO exposes participants + splitMode`

---

### T10: Tipos FE + payload do service
**What**: `FinancialTransaction` type ganha `participants`/`splitMode`; create/update body aceita `participants`/`splitMode` opcionais.
**Where**: `finsight-frontend/src/api/dtos/financialTransaction.ts`, `src/api/services/useFinancialTransactionService.ts` (modificar)
**Depends on**: T9
**Reuses**: Skill `api-integration`; padrão de DTO/mapper já existente
**Requirement**: SPLIT-06
**Tools**: MCP: NONE · Skill: `api-integration`
**Done when**:
- [ ] `ParticipantShare {memberId, memberName, shareAmount}` + campos no type
- [ ] Body de create/update aceita `splitMode?` + `participants?: {memberId, shareAmount?}[]`
- [ ] Gate: `npm run lint && npm run build`
**Tests**: none · **Gate**: build
**Commit**: `feat(split): frontend types + service payload for participants`

---

### T11: Coluna de titular na tabela (ENH-1 Parte 1)
**What**: Coluna "Titular" em `transactionColumns.tsx` — 1 participante → avatar+nome; N → indicador de rateio. Escondida em plano de 1 membro.
**Where**: `finsight-frontend/src/features/home/components/transactions/transactionColumns.tsx` (+ subcomponente se necessário)
**Depends on**: T10
**Reuses**: `getFirstAndLastInitials` (`formatters.ts:36`), padrão de avatar de `PlanMembersList`; `usePlanContext`/`useGetPlans` para contar membros; skill `component-creation`
**Requirement**: SPLIT-07
**Tools**: MCP: NONE · Skill: `component-creation`
**Done when**:
- [ ] Coluna renderiza titular (1) ou "N pessoas" (rateio) por linha
- [ ] Coluna omitida quando o plano ativo tem 1 membro
- [ ] Gate: `npm run lint && npm run build`
**Tests**: none (precedente FE de Shared Plans: gate build) · **Gate**: build
**Commit**: `feat(split): show attribution/participants column in transactions table`

---

### T12: Seletor de rateio no formulário (ENH-1 Parte 2) — P2
**What**: Seção de participantes no `TransactionFormDrawer`, visível só p/ OWNER/EDITOR: multiselect de membros + toggle EQUAL/EXACT + inputs (EXACT), com validação zod de soma = total.
**Where**: `finsight-frontend/src/features/home/components/transactions/TransactionFormDrawer.tsx` (+ subcomponente)
**Depends on**: T10, T11
**Reuses**: Skills `form-creation` + `component-creation`; `Controller` (RHF) p/ multiselect controlado; `myRole` do plano ativo
**Requirement**: SPLIT-08
**Tools**: MCP: NONE · Skill: `form-creation`, `component-creation`
**Done when**:
- [ ] Seção visível só p/ OWNER/EDITOR; escondida p/ CONTRIBUTOR (despesa 100% self)
- [ ] Toggle EQUAL/EXACT; inputs de valor em EXACT; zod valida soma = total antes do submit
- [ ] Payload envia `splitMode` + `participants`
- [ ] Gate: `npm run lint && npm run build`
**Tests**: none · **Gate**: build
**Commit**: `feat(split): participants/split selector in transaction form`

---

### T13: E2E de runtime (full-stack) — verificação final
**What**: Subir backend + frontend e exercer todos os ACs contra a API real, + verificar backfill da migration em cópia do dev DB.
**Where**: N/A (verificação)
**Depends on**: T6, T7, T8, T9, T11 (T12 se já pronto)
**Reuses**: Método de E2E de Shared Plans (T33/T52 — API-driven, dados descartáveis, limpeza ao fim)
**Requirement**: SPLIT-01..08
**Tools**: MCP: NONE · Skill: NONE
**Done when** (cada célula confirmada por status/resposta HTTP):
- [ ] **Backfill**: em cópia do dev DB, toda transação existente tem 1 participação 100% = `created_by`; `SUM(share_amount)==amount`; nenhuma sem participação
- [ ] **Default**: criar despesa sem participants ⇒ 1 participação 100% self (qualquer papel ≠ VIEWER)
- [ ] **Split EDITOR/OWNER**: despesa 50/50 entre 2 membros ⇒ persistida; response traz `participants`
- [ ] **PLAN-08**: breakdown por pessoa soma cotas; soma das cotas por pessoa == total do plano; atribuição de ex-membro sobrevive
- [ ] **Autz**: CONTRIBUTOR tentando atribuir/ratear a outro ⇒ **403**; VIEWER create ⇒ 403; `created_by` inalterado após update
- [ ] **Validação**: EXACT com soma≠total ⇒ **400**; membro não-do-plano ⇒ 400/403; duplicado ⇒ 400; PERCENT ⇒ 400
- [ ] **Recorrentes**: série gera participações em cada ocorrência
- [ ] **FE**: coluna de titular aparece em plano multi-membro e some no pessoal; (se T12) form rateia p/ OWNER/EDITOR
- [ ] Gates: backend `./mvnw -q -DskipTests package`, frontend `npm run lint && npm run build`
- [ ] Dados de teste limpos; dados reais pré-existentes inalterados (verificar via `psql`)
**Tests**: none (E2E manual/API — sem infra automatizada) · **Gate**: full (dois apps de pé)
**Commit**: (sem commit de código — atualizar este tasks.md com o resultado do E2E)

---

## Parallel Execution Map
```
Phase 1 (seq):   T1 ──→ T2
Phase 2 (par):   T2 ──┬─→ T3 [P] (unit)
                      ├─→ T4 [P] (unit)      # T4 não depende de T2 no código, mas agrupado aqui
                      ├─→ T5 [P] (build)
                      ├─→ T8 [P] (build)
                      └─→ T9 [P] (build)
Phase 3 (seq):   {T3,T4,T5} ──→ T6 ──→ T7
Phase 4 (seq):   T9 ──→ T10 ──→ T11 ──→ T12
Phase 5 (seq):   {T6,T7,T8,T11,T12} ──→ T13
```
> **Nota de paralelismo**: tasks unit-gated (T3, T4) são parallel-safe (lógica pura isolada). As build-gated (T5, T8, T9) tocam arquivos disjuntos e podem ser desenvolvidas em paralelo, mas o **gate de compilação serializa** (um `mvnw package` por vez) — executar via sub-agentes concorrentes e compilar no merge, como no precedente de Shared Plans (mudanças compile-coupled agrupadas).

---

## Pre-Approval Validation

### Check 1 — Task Granularity
| Task | Escopo | Status |
| --- | --- | --- |
| T1 | 1 migration | ✅ |
| T2 | 1 enum + 1 entidade + 1 mod (coeso: modelo) | ✅ |
| T3 | 1 classe pura + testes | ✅ |
| T4 | 1 método + testes | ✅ |
| T5 | DTOs de request (coeso) | ✅ |
| T6 | 1 helper + fiação create/update | ✅ |
| T7 | gerador + série (coeso) | ✅ |
| T8 | 1 query | ✅ |
| T9 | 1 DTO | ✅ |
| T10 | tipos + payload (coeso) | ✅ |
| T11 | 1 coluna/componente | ✅ |
| T12 | 1 seção de form | ✅ |
| T13 | verificação | ✅ |

### Check 2 — Diagram ↔ Definition Cross-Check
| Task | Depends on (body) | Diagrama | Status |
| --- | --- | --- | --- |
| T1 | None | raiz | ✅ |
| T2 | T1 | T1→T2 | ✅ |
| T3 | T2 | T2→T3 | ✅ |
| T4 | None (agrupado Phase 2) | T2→T4 | ✅ (nota no body) |
| T5 | T2 | T2→T5 | ✅ |
| T6 | T3,T4,T5 | {T3,T4,T5}→T6 | ✅ |
| T7 | T6 | T6→T7 | ✅ |
| T8 | T2 | T2→T8 | ✅ |
| T9 | T2 | T2→T9 | ✅ |
| T10 | T9 | T9→T10 | ✅ |
| T11 | T10 | T10→T11 | ✅ |
| T12 | T10,T11 | T10→T11→T12 | ✅ |
| T13 | T6,T7,T8,T11,T12 | →T13 | ✅ |

### Check 3 — Test Co-location Validation
| Task | Camada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T1 | migration | none | none | ✅ |
| T2 | model (JPA) | none (gap) | none+boot | ✅ |
| T3 | lógica pura | unit (precedente) | unit | ✅ |
| T4 | lógica pura (authz) | unit (precedente) | unit | ✅ |
| T5 | DTO | none | none | ✅ |
| T6 | service (DB-bound) | none (gap) → E2E | none | ✅ |
| T7 | gerador (pura) | unit (precedente) | unit | ✅ |
| T8 | repository query | none (gap) → E2E | none | ✅ |
| T9 | DTO | none | none | ✅ |
| T10 | FE api/service | none (build) | none | ✅ |
| T11 | FE componente | story/build (precedente build) | none | ✅ |
| T12 | FE form | story/build (precedente build) | none | ✅ |
| T13 | E2E | full | none/E2E | ✅ |

> Todas as camadas DB/HTTP-bound são "none (gap)" na matriz e verificadas no E2E de runtime (T13), consistente com o precedente de Shared Plans. `SplitResolver`, o guarda de authz e o gerador (lógica pura) recebem testes unitários reais.

---

## Progress Log

- ✅ **T1** (V6 migration — renumbered from V5, see SPEC_DEVIATION above) — commit `a0a5c39`.
- ✅ **T2** (SplitMode + TransactionParticipant entity + FinancialTransaction mapping) — commit `d31ce09`. Boot-verified against the live tunneled dev DB: Flyway applied v6, Hibernate `validate` passed. Backfill checked via `psql`: 51/51 transactions have exactly one participation, `share_amount == amount` for all, zero orphans.
- ✅ **T3** (SplitResolver EQUAL/EXACT + unit tests) — commit `7cf4003`. 6/6 tests green.
- ✅ **T4** (`requireCanAttributeToOthers` guard + tests) — commit `d987cc8`. PlanAuthorizationTest 24/24 (20 existing + 4 new).
- ✅ **T5** (request DTOs: `ParticipantInputDto` + `splitMode`/`participants` on both request DTOs) — commit `6a0ff8c`.
- ✅ **T8** (PLAN-08 repoint — `findPersonBreakdown` joins `participants`, sums `shareAmount`) — commit `e941a4e`.
- ✅ **T9** (response DTO — `participants`/`splitMode` on `FinancialTransactionResponseDto`) — commit `775c899`.
- ✅ **T6** (`applyParticipants` wired into create/update, membership+duplicate validation, attribution guard) — commit `c406acb`. Full test suite green.
- ✅ **T7** (`createSeries` resolves once, `RecurringTransactionGenerator` stamps participants per occurrence) — commit `56f5dd5`. RecurringTransactionGeneratorTest 10/10 (8 existing + 2 new, covering INSTALLMENT + RECURRING participant replication). Refactor note: extracted shared `ResolvedParticipant` record (package-private, `services/`) and a `requireAttributionAuthorizedIfNeeded` helper reused by create/update/createSeries — not a scope addition, just avoiding 3-way duplication of the same self-only check.
- ✅ **T10** (FE types: `SplitMode`, `ParticipantShare`, `ParticipantInput` on `financialTransaction.ts`; both create/series request bodies accept `splitMode?`/`participants?`) — commit `0c1271c`. No service-hook changes needed (`payload.body` passes through untouched).
- ✅ **T11** (titular/attribution column) — commit `f5b125c`. `ParticipantsCell` in `transactionColumns.tsx`: single participant → avatar+name, multiple → "N people" badge (native `title` tooltip, avoiding a Base UI `Tooltip`/`TooltipProvider` dependency not otherwise used in this file — see L-002 risk). Column is conditionally spread into the column array from a new `showParticipantsColumn` flag, computed in `TransactionsTab` from `useGetPlanMembers(activePlanId).length > 1` — hidden for personal (1-member) plans.
- ✅ **T12** (P2 — split selector) — commit `0b16912`. Added to `TransactionFormDrawer`: `splitMode`/`participants` zod fields + a `superRefine` mirroring the server's EXACT-sum-equals-total rule; section gated on `myRole ∈ {OWNER, EDITOR}` **and** `members.length > 1` (same signal as T11); checkbox-list multiselect (not a combobox — simpler, no new primitive) with per-member EXACT amount inputs shown only in EXACT mode; wired into both the single-transaction and series submit payloads. Edit/duplicate defaults populate `participants` from `transaction.participants` only when `length > 1` (a real split), so the common personal-expense edit doesn't show a pre-checked "split with just yourself."
- ✅ **T13** (full-stack E2E) — **21/21 checks passed**, zero bugs found. Backend booted on `:3099` against the live tunneled dev DB (Flyway v6, Hibernate `validate` green); ran a 5-user, API-driven scenario (owner/editor/contributor/viewer/ex-member) covering every "Done when" cell: backfill (51/51 pre-existing transactions, 1 participation each, `share_amount==amount`, re-verified post-cleanup), default self-100% create, EDITOR/OWNER EQUAL 50/50 split (sums exactly), PLAN-08 person-breakdown-sum == plan-total, ex-member historical attribution survives removal, CONTRIBUTOR-attributes-to-other → 403, VIEWER create → 403, `createdBy` immutable after EDITOR-edits-CONTRIBUTOR's-row, EXACT-sum-mismatch → 400, non-member participant → 400, duplicate participant → 400, PERCENT → 400, and a 3-occurrence INSTALLMENT series where every occurrence carries the same 2 resolved participants. Frontend: `npm run lint && npm run build` green (T10–T12, baseline-only warnings); `vite` dev server boots and serves 200 with no runtime import errors. **Caveat**: no browser-automation tool was available in this session, so T11/T12 were gate-verified (build/lint) and logically verified via the passing API scenario, but not interactively click-tested in a live browser — flag this for a human visual pass before considering ENH-1 fully done. All throwaway test data (5 users, 5 plans, 6 transactions, 4 invitations, 8 memberships) cleaned up via `psql`; DB re-verified byte-for-byte at the original baseline (3 users, 51 tx, 51 participants, 3 plans).
