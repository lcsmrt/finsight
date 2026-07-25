# Handoff — Pesquisa: Modelagem de despesa compartilhada (DEC-2 → DEC-1)

**Objetivo**: análise de prior art para decidir como o finSight deve modelar **atribuição** e **rateio** de despesas em planos compartilhados, evitando "reinventar a roda" e evitando migrar o schema duas vezes. Entregar uma recomendação de modelo/schema.

**Sem código.** Deliverable é um documento de análise. Pode rodar em paralelo à Fase A (`handoff-fase-a.md`) — não há dependência entre eles.

**Fonte da verdade das decisões**: `.specs/features/shared-plans/review.md`, itens **DEC-1** e **DEC-2** (leia-os primeiro; contêm o enquadramento e as opções já levantadas).

---

## O problema em uma frase
Hoje `createdBy` de uma transação carrega dois sentidos sobrepostos que só coincidem porque não dá pra lançar em nome de outra pessoa: (1) **autoria/auditoria** — quem digitou; (2) **titularidade** — de quem é a despesa. Além disso, uma despesa pode ser **dividida** (ex.: aluguel 50%/50%). Precisamos de um modelo que cubra atribuição a uma pessoa **e** rateio entre várias.

## Insight que orienta a análise
`attributedTo` (uma pessoa) é o **caso degenerado** de um rateio (N participações de 100%/…). Logo, decidir rateio (DEC-2) provavelmente **subsume** a decisão de atribuição (DEC-1). Modelar só um FK `attributedTo` agora e depois querer rateio ⇒ duas migrações. **Por isso a pesquisa vem antes de fechar o schema.**

## Pergunta de enquadramento (decide o modelo — responder explicitamente)
**O finSight é uma ferramenta de ORÇAMENTO ("pra onde foi nosso dinheiro") ou de ACERTO DE CONTAS ("quem deve a quem")?**
- Sinais atuais (dashboards, limites por categoria, breakdown por pessoa) sugerem **budgeting-first** → provavelmente basta **cotas de participação** que alimentam o breakdown, **sem** ledger de dívida interpessoal. **Validar essa hipótese** — não assumir.

## Prior art a cobrir
- **Splitwise / Tricount / Settle Up** — rastreadores de dívida: 1 despesa = total + pagador + N participações (igual / valores exatos / % / cotas) → saldos líquidos "quem deve a quem".
- **YNAB** — "split" é entre **categorias**, não pessoas (eixo diferente; entender por que).
- **Monarch Money / Copilot** — casais/finanças conjuntas: transação compartilhada com "sua parte" (%/50-50), foco em orçamento.
- **Contabilidade de partidas dobradas / split lines** — o modelo "correto" e pesado; usar como baliza.
- (Opcional) qualquer outro relevante que surgir (Cospend, Spliit, etc.).

Para cada um: como modela pagador vs beneficiário, como representa o split (igual/%/exato/cotas), se rastreia dívida, e o custo/complexidade.

## Mapear para as opções já levantadas (ver DEC-2 no review.md)
- **A** — Splits/participações (Splitwise-like): 1 transação + coleção `{member, share}`; despesa pessoal = participação única de 100% (subsume DEC-1).
- **B** — N transações separadas (ideia inicial do usuário): simples, mas perde o vínculo do evento único / dedup.
- **C** — % simples numa transação (rateio igualitário implícito).
- **D** — Ledger de dívida completo (só se o enquadramento for "acerto de contas").

## Deliverable esperado
Escrever em `.specs/features/shared-plans/research-shared-expenses.md`:
1. Tabela comparativa dos produtos (modelo de dados, tipo de split, dívida sim/não, complexidade).
2. Resposta fundamentada à pergunta de enquadramento (orçamento vs acerto de contas) para o finSight.
3. Recomendação de **modelo (A–D)** e esboço de **schema** (entidades/colunas/FKs), incluindo como a despesa pessoal e o `attributedTo` de DEC-1 se encaixam.
4. Impactos a antecipar: migration, `FinancialTransaction`, `create/update`, gerador de recorrentes, `findPersonBreakdown`/PLAN-08, DTOs + tipos FE, e regra de autorização (quem pode atribuir/ratear a quem por role — lembrar que autorização Layer 2 usa `createdBy`, que deve permanecer imutável).
5. Riscos e questões em aberto para o usuário decidir.

## Método
Duas formas (escolher/confirmar com o usuário):
- **Base de conhecimento** (rápido, sem citações).
- **Deep research com fontes citadas** — usar a skill `deep-research` (fan-out de buscas + verificação). Melhor se a decisão precisar ser defendida com referências.

## Fronteira
Não implementar nada. A implementação (ENH-1 + DEC-1 + repontar PLAN-08) só acontece **depois** desta análise e da decisão do usuário. Ao concluir, atualizar DEC-1/DEC-2 no `review.md` com a direção escolhida.
