# Handoff — Execução: Expense Splitting & Attribution (Fase B)

**Data**: 2026-07-12
**Feature**: `.specs/features/expense-splitting/` (Fase B de Shared Plans)
**Status**: **Planejamento completo (spec + design + tasks), aprovado. Nada implementado.** Pronto para Execute em sessão separada.

> Regra de processo: **quem planejou não executa.** Esta sessão fez Specify→Design→Tasks; a implementação é feita aqui, do zero, contra os artefatos abaixo.

---

## Fonte da verdade (ler nesta ordem)

1. `spec.md` — requisitos SPLIT-01..08 + critérios de aceite + rastreabilidade.
2. `design.md` — arquitetura, reuso (com `file:line` verificados), modelos de dados, contratos, tratamento de erro, decisões.
3. `tasks.md` — **13 tasks atômicas** (T1–T13), dependências, gates, e as 3 validações pré-aprovação (todas ✅).
4. `../shared-plans/research-shared-expenses.md` — análise + decisões travadas (o "porquê").
5. `../shared-plans/review.md` — DEC-1/DEC-2 (✅ decididos) + itens da auditoria.

## Decisões já travadas (não reabrir sem o usuário)

- **Modelo**: participações, **sem** ledger de dívida (finsight é budgeting-first). Despesa pessoal = participação única 100% (subsume DEC-1; **sem** coluna `attributed_to`).
- **Storage**: `share_amount` resolvido + `split_mode` (`EQUAL`/`EXACT`/`PERCENT`). MVP resolve só EQUAL/EXACT; PERCENT rejeitado (400) até implementar — adicionar depois = **0 migração**.
- **Autorização**: só **EDITOR/OWNER** rateiam a outros; **CONTRIBUTOR** só despesa própria 100%. `created_by` **imutável** (autoria + Layer-2).

## Contexto mínimo

- Monorepo `/home/lcs/dev/finsight`: `finsight-backend/` (Spring Boot 3.5.3, Java 17, **sem Lombok**), `finsight-frontend/` (React 19, Vite 6, TanStack, RHF+zod, Base UI, cva).
- **Flyway** dono do schema; `ddl-auto=validate`. Migrations em `finsight-backend/src/main/resources/db/migration/` (última é V4 → esta feature adiciona **V5**).
- Convenções: skills em `.claude/skills/` (`api-integration`, `component-creation`, `form-creation`) + `finsight-frontend/CLAUDE.md` + `.specs/codebase/CONVENTIONS.md`. **Seguir.**

## Gates (por task, ver `tasks.md`)

- Backend compile: `cd finsight-backend && ./mvnw -q -DskipTests package`
- Backend unit: `./mvnw test -Dtest=<SplitResolverTest|PlanAuthorizationTest|RecurringTransactionGeneratorTest>`
- Frontend: `cd finsight-frontend && npm run lint && npm run build` (baseline de lint pré-existente — não regredir)
- Boot/migration verify: subir com `SERVER_PORT=3099` (dev usa :3000) contra **cópia** do dev DB; Hibernate `validate` deve passar.

## Filosofia de teste (precedente do projeto)

Sem infra de teste de integração/E2E. **Lógica pura → testes unitários reais** (`SplitResolver`, `PlanAuthorization`, `RecurringTransactionGenerator`); tudo DB/HTTP-bound → **compile-gated + E2E de runtime na T13**. Um **commit atômico por task** (mensagens no `tasks.md`); mudanças compile-coupled podem ser 1 commit (como na Fase 4 de Shared Plans).

## Ordem de execução (caminho crítico)

`T1→T2` (migration+entidade, boot-verify) → `{T3,T4,T5}` (resolver/authz/DTOs) → `T6→T7` (service + recorrentes) → `T8,T9` (PLAN-08 + response DTO) → `T10→T11→T12` (FE) → **T13** (E2E full-stack + backfill em cópia do dev DB).

## Decisões de processo em aberto (o executor confirma com o usuário)

1. **Fatiamento**: parar após **T11** como 1º slice shippável (backend + exibição de titular) e deixar **T12** (form de rateio, P2) como 2º slice? Ou ir direto T1→T13?
2. **MCP de Postgres** para inspecionar/boot-verify o dev DB no T13 — se o usuário tiver um configurado, usar; senão, `psql` como no precedente.

## Cuidados

- **V5 é aditiva** (tabela+coluna+backfill), não destrutiva — mas **boot-verificar em cópia** antes do dev DB real (precedente T14/V3).
- `created_by` **nunca** muda — o gate de rateio (`requireCanAttributeToOthers`) só dispara quando as participações envolvem terceiros, para o CONTRIBUTOR não sofrer fricção no fluxo pessoal.
- Consistência: soma das cotas por transação == `amount` ⇒ totais do dashboard continuam batendo com o breakdown por pessoa (verificar no T13).

## Para retomar

Novo chat: "resume work — executar expense-splitting" e ler este handoff + `tasks.md`. Primeiro passo real: **T1** (migration V5).
