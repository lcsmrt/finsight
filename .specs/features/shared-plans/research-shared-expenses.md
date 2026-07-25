# Pesquisa — Modelagem de despesa compartilhada (DEC-2 → DEC-1)

**Data**: 2026-07-12
**Autor**: análise de prior art + mapeamento do sistema atual (sessão de pesquisa)
**Fonte da verdade das decisões**: `review.md` → **DEC-1** (separar autoria de titularidade) e **DEC-2** (rateio).
**Método**: deep research com fontes citadas (fan-out de buscas web + fetch das fontes) + leitura do código atual do finSight.
**Fronteira**: documento de análise. **Nenhum código foi alterado.** A implementação (ENH-1 + DEC-1 + repontar PLAN-08) só ocorre após a decisão de enquadramento do usuário.

> **✅ DECISÕES TOMADAS (2026-07-12)** — resolvem as pendências da §5:
> - **Modelo**: Opção A (participações), **sem** ledger de dívida.
> - **Storage**: `share_amount` resolvido **+** `split_mode` (`EQUAL`/`EXACT`/`PERCENT`). `%` = modo de entrada, resolvido no write ⇒ **0 migração** para adicionar depois.
> - **Autorização**: só **EDITOR/OWNER** rateiam a outros; **CONTRIBUTOR** só despesa própria (100% pra si). `createdBy` imutável.
> - **MVP**: igual + valor exato (% depois). **Naming**: `transaction_participants`. **PLAN-08**: repontar junto.
> Próximo passo: fase de design SDD (ver §6).

---

## 0. TL;DR (recomendação)

1. **Enquadramento**: finSight é **orçamento** ("pra onde foi o dinheiro"), **não** acerto de contas ("quem deve a quem"). O código confirma: limites por categoria com status `ok/warning/over`, breakdown por pessoa income/expense/net, e **zero** superfície de dívida/settle-up/transferência. A hipótese do handoff se sustenta com evidência interna **e** externa.
2. **Modelo recomendado: Opção A (participações), na variante budgeting-first — SEM ledger de dívida.** Uma despesa = 1 transação + N linhas de participação `{membro, cota}`. Despesa pessoal = participação única de 100% ⇒ **subsume DEC-1** (o `attributedTo` de uma pessoa é o caso degenerado de N=1). Isso é exatamente o que Monarch/Copilot fazem, e o subconjunto sem-dívida do que Splitwise/Spliit modelam.
3. **Não construir**: coleção de `Debts {from,to,amount}`, simplificação de dívida, saldos persistidos. Isso é domínio de rastreador de dívida (Splitwise/Settle Up), não de app de orçamento — e nenhum app de orçamento pesquisado o implementa.
4. **Uma migração, não duas**: modelar participações **agora** evita adicionar `attributed_to` (FK única) e depois ter que migrar para rateio. A junção **é** o mecanismo de atribuição.
5. **`createdBy` permanece imutável** (autoria/auditoria + Layer-2 authz). Titularidade/rateio vive na nova tabela de participações, mutável e gated por role.

---

## 1. Tabela comparativa dos produtos

| Produto | Modelo de dados da despesa compartilhada | Como expressa o split | Ledger de dívida ("quem deve a quem")? | Complexidade | Categoria |
|---|---|---|---|---|---|
| **Splitwise** | 1 expense (1 pagador) + participações; mantém saldos líquidos pareados entre pessoas | igual / valores exatos / **%** / cotas (shares) / ajustes +− | **Sim** — saldos líquidos + "Simplify debts" opcional (colapsa nº de pagamentos preservando o net de cada um) | Média-alta | Debt tracker |
| **Tricount** (bunq) | 1 expense com pagador + participantes; calcula saldos em tempo real; reembolso = expense marcada "transfer" | igual / cotas / valores exatos | **Sim** — tela "Balances" + settlement de pagamentos minimizados | Média | Debt tracker |
| **Settle Up** | 1 `Transaction` com **N pagadores** (`whoPaid[{memberId,weight}]`) e **N beneficiários** (`items[].forWhom[{memberId,weight}]`) | **weights** em ambos os lados; itens (expense/tip/tax) | **Sim, first-class** — coleção materializada `Debts {from,to,amount}`; flag `minimizeDebts` por grupo | Alta | Debt tracker |
| **Spliit** (OSS) | `Expense{amount,paidById,splitMode}` + junção `ExpensePaidFor{(expenseId,participantId), shares}` | `SplitMode` enum: `EVENLY` / `BY_SHARES` / `BY_PERCENTAGE` / `BY_AMOUNT`; `shares` inteiro por participante | **Não persiste** — saldos derivados somando cotas em read time | Baixa (~6 tabelas) | OSS splitter |
| **Cospend / IHateMoney** (OSS) | `bill{amount, payerid}` + junção `bill_owers{billid, memberid}` (**sem** coluna de cota); peso mora em `member.weight` | peso por pessoa (float, default 1) → split proporcional; modos custom | **Não persiste** — derivado | Baixa (~4-6 tabelas) | OSS splitter |
| **YNAB** | "split transaction" = 1 transação dividida entre **categorias/payees** (sub-transações somando o total) | por categoria + valor; **eixo diferente** (não é por pessoa) | **N/A** — split por pessoa é empurrado p/ ferramenta externa (Splitwise) | — | Orçamento (eixo categoria) |
| **Monarch Money** | contas mescladas + colaboradores; split de transação por **% ou valor** com owner (minha/dela/compartilhada); "Shared Views" | **% ou valor**; atribui a owner | **Não** — ownership dirige relatórios/perspectiva; orçamento ainda é único compartilhado; sem net-settlement | Média | Orçamento p/ casais |
| **Copilot Money** | single-user; split de transação **igual / % / valor** (somam 100%); reembolso = transação negativa na mesma categoria | igual / **% / valor** | **Não** — split é "purely for categorization"; reembolso zera o custo no orçamento, não vira dívida | Baixa-média | Orçamento p/ casais |
| **Double-entry** (GnuCash / Ledger / Fowler) | transação = conjunto de **split lines somando zero**, cada linha posta numa conta | valores por conta (somam zero) | Implícito (contas a receber por pessoa) | Alta (pesado) | Baseline "correto" |

**Fontes** (principais):
- Splitwise: [Debts made simple](https://blog.splitwise.com/2012/09/14/debts-made-simple/), [Simplify debts](https://feedback.splitwise.com/knowledgebase/articles/107220), [Split by %](https://feedback.splitwise.com/knowledgebase/articles/77463).
- Tricount: [help center](https://help.tricount.com/articles/how-can-i-manage-my-tricounts-and-expenses).
- Settle Up: [API entities](https://api.settleup.io/entities/) (schema oficial — `Transaction.whoPaid[]`, `items[].forWhom[]`, `Debts`, `Group.minimizeDebts`).
- Spliit: [`prisma/schema.prisma`](https://github.com/spliit-app/spliit/blob/main/prisma/schema.prisma) (`Expense`, `ExpensePaidFor.shares`, `SplitMode`).
- Cospend: [migração inicial](https://github.com/julien-nc/cospend-nc/blob/main/lib/Migration/Version000007Date20190401053312.php). IHateMoney: [`models.py`](https://github.com/spiral-project/ihatemoney/blob/master/ihatemoney/models.py).
- YNAB: [Split Transactions](https://support.ynab.com/en_us/split-transactions-a-guide-SJLEKwY0q), [Splitwise and YNAB](https://support.ynab.com/en_us/splitwise-and-ynab-a-guide-H1GwOyuCq).
- Monarch: [Shared Views](https://www.monarch.com/blog/shared-views) ("a single budget is still shared… exploring ways to bring ownership into this page"), [Splitting Transactions](https://help.monarch.com/hc/en-us/articles/360050178492).
- Copilot: [Splitting](https://help.copilot.money/en/articles/5325255), [Reimbursements](https://help.copilot.money/en/articles/5325170), [Shared recurring](https://help.copilot.money/en/articles/5324776).
- Double-entry: [GnuCash Transaction/Split](https://code.gnucash.org/docs/STABLE/group__Transaction.html), [Fowler — Accounting Transaction](https://martinfowler.com/eaaDev/AccountingTransaction.html), [hledger](https://hledger.org/balancing-the-accounting-equation.html).

> **Ressalva de qualidade de fonte**: mecânicas centrais de Splitwise/Tricount vêm de blog/help oficiais; as caracterizações algorítmicas (NP-completo, min-cost-flow, integer programming) vêm só de posts de terceiros (Medium) — tratadas como não-oficiais e **irrelevantes** para a recomendação (não vamos construir simplificação de dívida). Artigos do help do Monarch retornaram 403 no fetch direto; os fatos foram confirmados pelas páginas de blog/marketing do próprio Monarch que afirmam o mesmo.

### Dois padrões arquetípicos que emergem

1. **Rastreador de dívida** (Splitwise / Tricount / Settle Up): 1 despesa (pagador + participações ponderadas) → **ledger de saldos líquidos interpessoais** → simplificação opcional de pagamentos. O objetivo é **quitar**.
2. **Participação/atribuição** (Monarch / Copilot; e os splitters OSS quando você ignora o cálculo de saldo): a mesma despesa com cotas por pessoa, mas o resultado **alimenta o orçamento/breakdown de cada um** — **sem** saldo a quitar. Reembolso é tratado como transação que zera o custo, não como crédito interpessoal.

O ponto crítico da pesquisa: **a estrutura de dados da despesa é a MESMA nos dois padrões** (1 expense + N participações). A diferença é só se você **materializa e persiste saldos de dívida** por cima. Ou seja: adotar participações **não** obriga a virar um Splitwise — é o mesmo modelo que Monarch/Copilot usam para puro orçamento.

---

## 2. Enquadramento: finSight é orçamento, não acerto de contas

**Pergunta**: o finSight é ferramenta de **ORÇAMENTO** ("pra onde foi nosso dinheiro") ou de **ACERTO DE CONTAS** ("quem deve a quem")?

**Resposta: orçamento (budgeting-first).** Não é hipótese — está no código:

- **Limites por categoria com status**: `CategorySpendingChart.tsx` computa `no-limit | ok | warning | over` contra `FinancialTransactionCategory.spendingLimit`, com `WARNING_THRESHOLD = 0.8` e barra gasto-vs-restante. Isso é orçamento puro.
- **Breakdown por pessoa é income/expense/net**: `PersonBreakdownList.tsx` ("By Person") mostra receita/despesa/líquido por `userId`. O `net` de `PersonBreakdownDto` é `income − expense` (o quanto cada um movimentou), **não** um saldo "fulano deve a beltrano".
- **Ausência total de superfície de dívida**: não há entidade, DTO, tela, botão de "settle up", transferência, ou "quem deve a quem" em lugar nenhum (backend ou frontend). A agregação (`findPersonBreakdown`) é um `GROUP BY createdBy` que soma valores — não calcula arestas de dívida.

Isso alinha o finSight exatamente com **Monarch/Copilot** (orçamento p/ casais) e o distingue de **Splitwise/Tricount/Settle Up** (rastreadores de dívida). E a evidência externa fecha o argumento: **nenhum** app de orçamento pesquisado implementa ledger de dívida — todos expressam despesa compartilhada como **cota atribuída ao orçamento de cada pessoa**. Construir um ledger no finSight seria resolver um problema que o produto não tem.

**Consequência de modelagem**: precisamos de **cotas de participação que alimentam o breakdown**, e **não** de um ledger de dívida (Opção D descartada). Isso simplifica muito o escopo.

---

## 3. Recomendação de modelo + esboço de schema

### Escolha: Opção A (participações), variante sem-dívida

Reafirmando as opções de DEC-2:
- **A — Participações (Splitwise-like na estrutura, Monarch-like no comportamento)**: 1 transação + coleção `{membro, cota}`. ✅ **Recomendada.**
- **B — N transações separadas + `groupId`**: perde o vínculo do evento único, dedup e edição conjunta; reintroduz o problema que a junção resolve. ❌
- **C — % simples numa transação**: caso particular de A com menos flexibilidade (só rateio igualitário/percentual, sem valores exatos). ❌ (A já cobre, sem custo extra relevante.)
- **D — Ledger de dívida completo**: só se fôssemos acerto de contas. ❌ (não somos — §2).

**Por que A subsume DEC-1**: `attributedTo` (uma pessoa) é a participação única de 100%. Se toda transação sempre tem ≥1 linha de participação, então:
- Despesa pessoal (plano de 1 membro) = 1 linha, membro = autor, cota = valor total.
- "Minha esposa comprou isso" = 1 linha, membro = esposa, cota = 100%.
- Aluguel 50/50 = 2 linhas de 50%.

Não adicionamos `attributed_to` **e** uma junção (dois mecanismos = risco de migrar duas vezes, exatamente o que o handoff alerta). **A junção É a atribuição.** DEC-1 deixa de precisar de coluna própria.

### Esboço de schema (Postgres / Flyway V5)

Nova tabela de participações (nome provisório `transaction_participants`; alternativas: `transaction_shares`, `financial_transaction_participants`):

```sql
-- V5__add_transaction_participants.sql (esboço)
CREATE TABLE transaction_participants (
    id             BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    transaction_id BIGINT      NOT NULL REFERENCES financial_transactions(id) ON DELETE CASCADE,
    member_user_id BIGINT      NOT NULL REFERENCES users(id),   -- o titular/beneficiário
    share_amount   NUMERIC(19,2) NOT NULL,                       -- valor resolvido desta pessoa (soma = amount da transação)
    CONSTRAINT uq_txn_participant UNIQUE (transaction_id, member_user_id)
);
CREATE INDEX idx_txn_participants_txn    ON transaction_participants(transaction_id);
CREATE INDEX idx_txn_participants_member ON transaction_participants(member_user_id);

-- (opcional) modo de split guardado na transação, para reconstruir a UI de edição:
ALTER TABLE financial_transactions
    ADD COLUMN split_mode VARCHAR(16) NOT NULL DEFAULT 'EQUAL';  -- EQUAL | SHARES | PERCENT | AMOUNT

-- backfill: toda transação existente vira participação única de 100% para o autor
INSERT INTO transaction_participants (transaction_id, member_user_id, share_amount)
SELECT id, created_by, amount FROM financial_transactions;
```

**Decisão de armazenamento — persistir o valor resolvido (`share_amount`) vs. peso (`shares` + modo)**:

- **Recomendo persistir `share_amount`** (valor absoluto por pessoa), calculado no write a partir do modo escolhido (igual/%/exato/cotas). Razões: (1) o breakdown fica um `GROUP BY member SUM(share_amount)` trivial e barato — casa com o padrão atual do finSight de guardar valores resolvidos (o `amount` já é magnitude resolvida, direção no `type`); (2) evita recomputar rateio + arredondamento a cada leitura; (3) invariante simples de validar no write: `SUM(share_amount) == amount`.
- **`split_mode` na transação é opcional** e serve só para a UI reconstruir "como foi dividido" ao editar (ex.: mostrar 50%/50% em vez de valores). Spliit guarda o modo + `shares` inteiro; Cospend/IHateMoney guardam só peso por pessoa e recomputam. Para budgeting-first, guardar o resolvido é o mais simples e é suficiente; `split_mode` é conveniência, não necessidade.
- **Arredondamento**: com valores resolvidos, o write distribui o total e joga o centavo residual numa das linhas (padrão dos splitters). Guardar só % exigiria decidir isso na leitura — mais um motivo para resolver no write.

**Tipo/sinal**: `share_amount` herda a semântica do `type` da transação-pai (DEBIT=despesa, CREDIT=receita); positivo, como o `amount`. O breakdown continua separando income/expense pelo `type` da transação, agora agrupando por `member_user_id` em vez de `created_by`.

### Como `createdBy` e `attributedTo` se encaixam

| Conceito | Onde vive (recomendado) | Mutável? | Uso |
|---|---|---|---|
| **Autoria** (`createdBy`) | coluna atual `financial_transactions.created_by` | **Não** (imutável) | Auditoria + **Layer-2 authz** (`requireCanModifyTransaction` usa `createdBy == actor` p/ CONTRIBUTOR) |
| **Titularidade / rateio** (era `attributedTo` de DEC-1) | linhas em `transaction_participants` | **Sim** (gated por role) | Breakdown por pessoa (PLAN-08) + seletor/exibição do ENH-1 |

`createdBy` **não** vira coluna de titularidade (isso quebraria authz e auditoria — exatamente o que DEC-1 alerta). DEC-1 fica **resolvido pela junção**: não há coluna `attributed_to`; o "titular" de uma despesa comum é o único participante.

---

## 4. Impactos a antecipar

Checklist de tudo que muda quando ENH-1 + DEC-1/DEC-2 forem implementados (referências ao mapa do código atual):

- **Migration (V5)**: nova tabela `transaction_participants` + (opcional) `split_mode`; backfill "1 participação de 100% = autor" para todas as linhas existentes. `ddl-auto=validate` já em vigor; Flyway dono do schema.
- **Entidade `FinancialTransaction.java`**: adicionar `@OneToMany` para as participações (cascade + orphanRemoval), mantendo `createdBy` como está. Considerar entidade `TransactionParticipant`.
- **`FinancialTransactionService.create` (linhas ~93-119)**: hoje carimba `createdBy = ctx.getUser()` e não aceita participação. Passa a: (1) aceitar lista de participações opcional no request; (2) default = participação única 100% para `ctx.getUser()` (ou para o titular informado) quando ausente; (3) validar `SUM(share_amount) == amount`; (4) validar que **cada** `member_user_id` é membro do plano (`ctx.getPlan()`); (5) gate por role (ver autorização).
- **`FinancialTransactionService.update` (linhas ~121-146)**: passa a permitir editar as participações (substituir o conjunto), gated por role. `createdBy`/`plan` continuam imutáveis. Revalidar invariante de soma e pertencimento ao plano.
- **Request/Response DTOs**: `FinancialTransactionRequestDto` ganha `participants: [{memberUserId, share|shareAmount}]` (+ `splitMode` opcional). `FinancialTransactionResponseDto` ganha `participants` (id+nome+valor por pessoa). `CreatedByDto` (id+name) permanece para autoria.
- **Tipos FE** (`src/api/dtos/financialTransaction.ts`): adicionar `participants` ao tipo `FinancialTransaction` e ao create body; manter `createdBy`.
- **Gerador de recorrentes (`RecurringTransactionGenerator.java`)**: cada ocorrência materializada precisa **carimbar as participações** (copiar o template de split da série), além do `createdBy`. Hoje só carimba `createdBy` a partir de `ctx.getUser()` (linha ~77). Séries são expandidas eagerly no create — o split entra no `baseTransaction`.
- **PLAN-08 — `findPersonBreakdown` (repo linhas ~60-68)**: hoje `GROUP BY ft.createdBy.id, ft.createdBy.name, ft.type` somando `ft.amount`. Passa a **join com `transaction_participants`** e `GROUP BY participant.member_user_id, ..., ft.type` somando `share_amount`. Semântica muda de "por quem lançou" → "de quem é o gasto" (o objetivo declarado de PLAN-08). `DashboardService.buildPersonBreakdown` e `PersonBreakdownDto` seguem quase iguais (a chave passa a ser o membro-participante).
- **ENH-1 Parte 1 (exibir)**: coluna/indicador de titular em `transactionColumns.tsx`. Com participações: se 1 participante, mostrar avatar+nome; se N, mostrar "N pessoas" / lista. Esconder no plano de 1 membro (ruído). Enquanto não implementado, exibir `createdBy` (coincide hoje).
- **ENH-1 Parte 2 (selecionar/ratear)**: campo de participantes+cotas no `TransactionFormDrawer`, visível/limitado conforme `myRole`.
- **Autorização (regra de quem pode atribuir/ratear a quem)** — precisa decisão explícita, ver §5. Proposta inicial, coerente com `PlanAuthorization` atual:
  - `createdBy` **sempre** imutável = `ctx.getUser()` (Layer-2 depende disso).
  - **CONTRIBUTOR**: só cria/edita transações próprias (regra atual `createdBy == actor`) e só pode atribuir/ratear **envolvendo a si mesmo** (não pode lançar 100% no nome de outro).
  - **EDITOR/OWNER**: podem atribuir/ratear entre **quaisquer** membros do plano.
  - **VIEWER**: nada (já bloqueado).
  - Todo `member_user_id` deve ser membro ativo do plano (validar no service).

---

## 5. Riscos e questões em aberto (decisão do usuário)

1. **Confirmar o enquadramento**: a análise recomenda **orçamento sem ledger de dívida** (§2). Se em algum momento o objetivo for "quem deve a quem / quitar" (Splitwise), o modelo muda para Opção D e a recomendação aqui **não** se aplica. → *Confirmar: budgeting-first, sem settle-up?*
2. **Armazenar valor resolvido vs. peso/%**: recomendo `share_amount` resolvido (§3). Se o usuário quiser preservar a intenção "50%" e recomputar quando o total muda (estilo Cospend), guardar peso/modo. Trade-off: query trivial + arredondamento no write (recomendado) vs. flexibilidade de reproporção automática. → *Decisão de storage.*
3. **Modos de split a suportar no MVP**: igual / % / valores exatos / cotas. Sugiro começar com **igual + valores exatos** (cobre 90%: "cada um metade" e "eu paguei 30, ela 70"), adicionar % depois. → *Escopo do MVP.*
4. **Nome da tabela/campos**: `transaction_participants.share_amount` vs. `transaction_shares` vs. `financial_transaction_participants`. Sem `paidBy` (enviesado a despesa; transação também é CREDIT). → *Naming.*
5. **Repontar PLAN-08 agora ou depois**: mudar o `GROUP BY` para participações torna o breakdown semanticamente correto ("de quem é o gasto"), mas muda números já exibidos. Fazer junto com ENH-1 ou como passo separado? → *Sequência.*
6. **Matriz de autorização** (§4): confirmar a regra CONTRIBUTOR-só-a-si-mesmo vs. EDITOR/OWNER-a-qualquer-um. É a única parte com decisão de produto real. → *Confirmar matriz.*
7. **Participação sempre presente vs. lazy**: recomendo **sempre** ≥1 linha (uniformidade, PLAN-08 sem `LEFT JOIN`/fallback). Custo: 1 join no breakdown e 1 linha por transação existente (backfill). Alternativa lazy (participações só quando N>1, fallback em `created_by`) economiza linhas mas reintroduz dois caminhos. → *Confirmar "sempre".*
8. **Migração de dados**: o backfill é determinístico e seguro (`created_by`, `amount`). Sem risco de perda; reversível conceitualmente (basta ignorar a tabela). Testar em cópia do dev DB antes.
9. **Sem teste automatizado dos guardas** (ver BE-7 no review): as novas regras de autorização de rateio herdariam a mesma lacuna — sem infra de teste de integração, só E2E manual. Risco residual a registrar.

---

## 6. Próximos passos

1. Usuário decide as questões da §5 (mínimo: enquadramento §5.1, storage §5.2, matriz §5.6).
2. Atualizar **DEC-1** e **DEC-2** no `review.md` com a direção escolhida (feito parcialmente: marcados como "análise concluída, recomendação Opção A sem-dívida, aguardando confirmação").
3. Só então: fase de design de ENH-1 (Partes 1 e 2) + DEC-1 + repontar PLAN-08, construindo a superfície de titular/rateio **uma vez**, contra o campo certo (participações), conforme a "Ordem sugerida / Fase B" do review.

> **Regra rígida mantida**: implementar ENH-1 só **depois** de DEC-2 → DEC-1. Exibir `createdBy` como "titular" antes disso é aceitável só como placeholder (coincide hoje), mas o rateio real espera a decisão.
