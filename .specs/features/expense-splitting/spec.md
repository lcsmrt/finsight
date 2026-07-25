# Expense Splitting & Attribution — Specification

**Feature**: Fase B de Shared Plans — atribuição e rateio de despesas.
**Origem**: `../shared-plans/review.md` (ENH-1, DEC-1, DEC-2) + análise em `../shared-plans/research-shared-expenses.md` (decisões ✅ travadas 2026-07-12).
**Relação**: estende a feature Shared Plans (não a substitui). PLAN-08 é repontado aqui.

## Problem Statement

Hoje `createdBy` de uma transação carrega dois sentidos sobrepostos: **autoria** (quem digitou, imutável, usado pela autorização Layer 2) e **titularidade** (de quem é a despesa, o que o breakdown por pessoa quer mostrar). Além disso, uma despesa pode ser **dividida** entre membros (ex.: aluguel 50/50) e hoje não há como representar isso. Precisamos separar autoria de titularidade **e** permitir rateio — com um único mecanismo, para não migrar o schema duas vezes.

## Decisões (travadas — ver research-shared-expenses.md §0 e §3)

- **Modelo**: participações (Opção A), **sem** ledger de dívida. finSight é budgeting-first.
- **Despesa pessoal = participação única de 100%** → subsume DEC-1 (sem coluna `attributed_to`).
- **Storage**: `share_amount` resolvido por participante + `split_mode` (`EQUAL`/`EXACT`/`PERCENT`) na transação. `%` é modo de entrada (resolvido no write) ⇒ adicionar depois = 0 migração.
- **Autorização**: só **EDITOR/OWNER** rateiam a outros; **CONTRIBUTOR** só lança despesa própria (100% pra si). `createdBy` imutável.
- **MVP**: modos `EQUAL` + `EXACT`; `PERCENT` depois.

## Out of Scope

| Item | Motivo |
| --- | --- |
| Ledger de dívida / "quem deve a quem" / settle-up / simplificação | finSight é orçamento, não acerto de contas (research §2) |
| Múltiplos pagadores por despesa (Settle Up-like `whoPaid[]`) | Não há conceito de "pagador" separado de titular; fora do escopo budgeting |
| Modo `PERCENT` na UI | Pós-MVP; storage já preparado (0 migração) |
| Rateio de receita (CREDIT) com regra especial | Participações aplicam-se a ambos os tipos uniformemente; sem regra extra |
| Sub-limites por pessoa | Já fora de escopo em Shared Plans (limite é plan-total) |

---

## Requirements

### SPLIT-01 — Modelo de participações (subsume DEC-1) ⭐ MVP
Toda transação passa a ter **≥1 participação** `{member_user_id, share_amount}`. Migration cria a tabela e faz backfill de 1 participação de 100% para `created_by` de cada transação existente. Coluna `split_mode` na transação.

**AC:**
1. WHEN a migration roda THEN cada `financial_transaction` existente SHALL ter exatamente uma participação com `member_user_id = created_by` e `share_amount = amount`, e `split_mode = 'EQUAL'`.
2. WHEN uma participação é criada THEN `member_user_id` SHALL referenciar um `users(id)` que é membro ativo do plano da transação.
3. WHEN as participações de uma transação são somadas THEN `SUM(share_amount)` SHALL igualar `amount` da transação (tolerância de arredondamento zero — a resolução garante soma exata).
4. WHEN uma transação é lida THEN nenhuma SHALL ficar sem ao menos uma participação.

### SPLIT-02 — Create/update com participações ⭐ MVP
`create`/`update` aceitam uma lista opcional de participações. Ausente ⇒ default participação única 100% para `createdBy`. Presente ⇒ resolver `share_amount` conforme `split_mode` e validar invariantes.

**AC:**
1. WHEN `create`/`update` recebe participações omitidas THEN o sistema SHALL criar uma participação única 100% para `ctx.getUser()`.
2. WHEN `split_mode = EQUAL` THEN o sistema SHALL dividir `amount` igualmente entre os membros informados, distribuindo o centavo residual de forma determinística (soma exata = `amount`).
3. WHEN `split_mode = EXACT` THEN os `share_amount` informados SHALL somar exatamente `amount`, senão erro 400.
4. WHEN qualquer `member_user_id` não é membro do plano THEN o sistema SHALL rejeitar (400/403).
5. WHEN há `member_user_id` duplicado na mesma transação THEN o sistema SHALL rejeitar.
6. WHEN `update` substitui as participações THEN as antigas SHALL ser removidas e as novas persistidas atomicamente; `createdBy` e `plan` permanecem imutáveis.

### SPLIT-03 — Autorização de rateio ⭐ MVP
**AC:**
1. WHEN um **CONTRIBUTOR** cria/edita uma transação THEN as participações SHALL ser exatamente `[{self, 100%}]`; qualquer tentativa de incluir outro membro ou dividir SHALL ser negada (403).
2. WHEN um **EDITOR/OWNER** cria/edita THEN pode ratear entre quaisquer membros do plano.
3. WHEN um **VIEWER** tenta qualquer create/update THEN negado (já coberto por `requireCanCreateTransaction`).
4. WHEN uma transação é editada THEN `created_by` SHALL permanecer imutável (autoria + Layer 2 preservadas).
5. WHEN a autorização é decidida THEN SHALL ser server-side.

### SPLIT-04 — Séries recorrentes carimbam participações ⭐ MVP
**AC:**
1. WHEN uma série (INSTALLMENT/RECURRING) é criada com participações THEN **cada ocorrência** SHALL receber as participações resolvidas (mesmo `share_amount` por ocorrência, pois o `amount` por ocorrência é constante).
2. WHEN participações são omitidas na série THEN cada ocorrência SHALL receber a participação única 100% para `createdBy`.
3. A autorização de SPLIT-03 SHALL aplicar-se à criação da série.

### SPLIT-05 — Repontar PLAN-08 (breakdown por titular) ⭐ MVP
**AC:**
1. WHEN `findPersonBreakdown` roda THEN SHALL agrupar por **participante** somando `share_amount`, em vez de agrupar por `created_by` somando `amount`.
2. WHEN todas as transações são pessoais (participação única 100%) THEN o breakdown SHALL produzir os mesmos números de hoje (retrocompatível).
3. WHEN um participante foi removido do plano THEN sua atribuição histórica SHALL permanecer no breakdown (não descartada).
4. WHEN os totais do dashboard (income/expense/net) e o breakdown por pessoa são comparados THEN a soma das cotas por pessoa SHALL igualar o total do plano (consistência).

### SPLIT-06 — DTOs + tipos FE expõem participações ⭐ MVP
**AC:**
1. `FinancialTransactionResponseDto` SHALL incluir `participants: [{memberId, memberName, shareAmount}]` e `splitMode`. `createdBy` permanece (autoria).
2. O tipo FE `FinancialTransaction` SHALL incluir `participants` e `splitMode`; o create/update body SHALL aceitar participações opcionais.

### SPLIT-07 — Exibir titular/participantes na tabela (ENH-1 Parte 1) ⭐ MVP
**AC:**
1. WHEN o plano tem >1 membro THEN a tabela de transações SHALL mostrar o titular (participação única) ou um indicador de rateio (N participantes) por linha.
2. WHEN o plano tem 1 só membro (pessoal) THEN a coluna SHALL ser omitida (ruído desnecessário).
3. A exibição SHALL reusar o padrão de avatar/iniciais já usado em `PlanMembersList`.

### SPLIT-08 — Selecionar/ratear no formulário (ENH-1 Parte 2)
**AC:**
1. WHEN o usuário é **EDITOR/OWNER** THEN o form SHALL permitir escolher participantes e o modo (`EQUAL`/`EXACT`) e as cotas.
2. WHEN o usuário é **CONTRIBUTOR** THEN o form SHALL não oferecer rateio (despesa própria 100%).
3. O form SHALL validar client-side que as cotas somam o total (espelhando a regra server-side), mas a autoridade é o servidor.

---

## Requirement Traceability

| ID | Requisito | Prioridade | Tasks | Status |
| --- | --- | --- | --- | --- |
| SPLIT-01 | Modelo de participações + migration/backfill | P1 | T1, T2 | Verified |
| SPLIT-02 | Create/update com participações + resolução | P1 | T3, T5, T6 | Verified |
| SPLIT-03 | Autorização de rateio | P1 | T4, T6 | Verified |
| SPLIT-04 | Séries carimbam participações | P1 | T7 | Verified |
| SPLIT-05 | Repontar PLAN-08 | P1 | T8 | Verified |
| SPLIT-06 | DTOs + tipos FE | P1 | T5, T9, T10 | Verified |
| SPLIT-07 | Exibir titular na tabela (ENH-1 P1) | P1 | T11 | Verified |
| SPLIT-08 | Form de rateio (ENH-1 P2) | P2 | T12 | Verified |
| (todos) | Verificação E2E de runtime | P1 | T13 | Verified |

**Formato ID:** `SPLIT-[NUMBER]`

---

## Success Criteria

- [x] Toda transação (nova e migrada) tem participações que somam exatamente o `amount`.
- [x] Um EDITOR/OWNER cria uma despesa 50/50 entre dois membros; o breakdown por pessoa mostra metade para cada; o total do plano é inalterado.
- [x] Um CONTRIBUTOR não consegue (server-side) atribuir despesa a outro membro.
- [x] `createdBy` nunca muda; a autorização Layer 2 (CONTRIBUTOR edita só as próprias linhas) continua válida.
- [x] PLAN-08 mostra "de quem é o gasto" (participante), e é retrocompatível para planos pessoais.
- [x] Sem segunda migração para adicionar `PERCENT` no futuro.
