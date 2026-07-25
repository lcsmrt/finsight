# Shared Plans — Code Review Findings

**Spec**: `.specs/features/shared-plans/spec.md`
**Reviewed**: 2026-07-12
**Purpose**: Registro dos achados de code review para uma sessão de correções posterior.
**Régua**: skills `api-integration`, `component-creation`, `feature-structure`, `form-creation` + `finsight-frontend/CLAUDE.md` + `.specs/codebase/CONVENTIONS.md`, além de anti-patterns gerais.

> Status legenda: ⬜ aberto · 🔧 em correção · ✅ corrigido

---

## Frontend

### 🔴 FE-1 (Alta) — Fluxo de convite quebrado para usuário deslogado (viola spec)
- **Onde**: `src/app/routing/AppRouter.tsx:25` (rota dentro de `<PrivateRoute>`), `src/app/routing/PrivateRoute.tsx:5` (`<Navigate to="/login" />` sem preservar destino), `src/features/login/LoginPage.tsx:49` (navega sempre para `PATHS.home`).
- **Problema**: convidado novo abre `/invitations/:token` deslogado → redirecionado para `/login` → após login/registro cai na home e **o token é perdido**. Contraria spec (Edge Cases + PLAN-04 AC2: "register then land on acceptance; invite survives until accepted"). Reforço: `tasks.md` já registrou que `GET /invitations/{token}` exige auth (403 anônimo).
- **Correção sugerida**: preservar `location` no redirect (`<Navigate to="/login" state={{ from: location }} />`), consumir `from` no `LoginPage`/`RegisterUserPage`, garantir sobrevivência do token através do registro.
- **Status**: ✅

### 🟡 FE-2 (Média) — `src/api` passou a depender de uma feature (layering invertido)
- **Onde**: `src/api/services/useFinancialTransactionService.ts:18`, `useDashboardService.ts:5`, `useFinancialTransactionCategoryService.ts:16` importam `usePlanContext` de `@/features/plans/PlanProvider`.
- **Problema**: a camada global de API depende de um módulo de feature — inversão da hierarquia (`feature → api`, nunca o contrário). Precedente do projeto: `AuthProvider` (cross-cutting, consumido pela API) vive em `@/app/providers/`.
- **Correção sugerida**: mover `PlanProvider` para `src/app/providers/` ao lado do `AuthProvider`.
- **Status**: ✅

### 🟡 FE-3 (Média) — `PlanProvider` não memoiza o value do context
- **Onde**: `src/features/plans/PlanProvider.tsx:39` (`setActivePlanId` recriada a cada render), `:68` (`value={{...}}` objeto novo a cada render).
- **Problema**: todo hook de dado escopado consome `usePlanContext`; qualquer re-render do provider propaga para todos os consumidores.
- **Correção sugerida**: `useCallback` no `setActivePlanId` + `useMemo` no value.
- **Status**: ✅

### 🟡 FE-4 (Média) — Chamadas axios sem generic → `any` silencioso
- **Onde**: `src/api/services/useInvitationService.ts` — `createInvitation` (:17), `getInvitationPreview` (:39), `getPlanInvitations` (:57), `acceptInvitation` (:105) chamam `finsightApi.get/post` sem tipo, devolvendo `any` como se fosse o tipo anotado.
- **Problema**: cast não checado; viola "avoid `any`/forced `as`" do CLAUDE.md. `usePlanService` faz certo (`.get<RawPlan[]>`).
- **Correção sugerida**: tipar as respostas (`finsightApi.get<InvitationPreview>(...)` etc.).
- **Status**: ✅

### 🟢 FE-5 (Baixa) — Copy de toast misturando PT/EN
- **Onde**: `usePlanService`/`useInvitationService` em PT ("Plano criado com sucesso."); `useFinancialTransactionService` em EN ("Transaction created successfully."); `useFinancialTransactionCategoryService` mistura os dois.
- **Correção sugerida**: padronizar idioma das mensagens (provavelmente PT).
- **Status**: ✅

### 🟢 FE-6 (Baixa) — `inviteSchema` aceita `"OWNER"` que a UI nunca oferece
- **Onde**: `src/features/plans/components/InvitePlanDialog.tsx:35` (`z.enum([... "OWNER" ...])`) vs `ROLE_OPTIONS` (sem OWNER).
- **Correção sugerida**: alinhar o enum do zod a `ROLE_OPTIONS`.
- **Status**: ✅

### 🟢 FE-7 (Baixa) — `canInvite` redundante com `isOwner`
- **Onde**: `src/features/plans/PlansPage.tsx:49-50` — valores idênticos; `canInvite` só é usado dentro do bloco `isOwner` (sempre `true` ali).
- **Correção sugerida**: remover `canInvite`.
- **Status**: ✅

### 🟢 FE-8 (Baixa) — `setValue` sem `{ shouldValidate: true }` + casts `as`
- **Onde**: `InvitePlanDialog.tsx:170,189` — `Select` controlados via `setValue("type"/"role", value as ...)`.
- **Correção sugerida**: seguir a skill de forms (`setValue(..., { shouldValidate: true })`); reduzir casts.
- **Status**: ✅

### 🟢 FE-9 (Baixa) — Botões destrutivos não desabilitam durante pending
- **Onde**: `PlansPage.tsx` (arquivar/sair) — `isPending` das mutations não usado; permite duplo clique.
- **Correção sugerida**: desabilitar/loading enquanto pendente.
- **Status**: ✅

---

## Notas de revisão de skill (não são defeitos)

### SKILL-1 — Escolha de container não deve ser tabela rígida
- **Contexto**: as skills `component-creation`/`form-creation` afirmam que `Dialog` é "not for CRUD forms" e que create/edit → `Sheet`.
- **Decisão do usuário (2026-07-12)**: não faz sentido um `Sheet` para um form de campo único. A escolha entre `Dialog` / `Sheet` / `Página dedicada` depende do caso de uso, tamanho do form, complexidade — não de uma regra binária. `CreatePlanDialog`/`RenamePlanDialog`/`InvitePlanDialog` em `Dialog` estão **corretos**.
- **Ação**: revisar o texto das skills para descrever a escolha como um espectro guiado por caso de uso/tamanho, em vez de proibir CRUD em Dialog. (Skills em `~/dev/mindmap` / `.claude/skills/`.)
- **Nota**: `~/dev/mindmap/.claude/skills/web-component-creation/SKILL.md` é um stub genérico sem a seção de UI Container Choice — nada a revisar lá. O texto rígido só existia nas cópias locais do projeto (`finsight/.claude/skills/component-creation/SKILL.md` e `form-creation/SKILL.md`), já corrigidas.
- **Status**: ✅

---

## Backend

> Contexto positivo (não são problemas): re-escopo `user → plan` está limpo (nenhum resíduo de `:user` fora das memberships); `PlanAuthorization` cobre a matriz de acesso corretamente; soft-delete filtra `deletedAt is null` em `findAllByUser`/`findByCreatedByAndIsDefaultTrue` e `getMembership`; `GlobalExceptionHandler` mapeia tudo (403/404/409/410/400), inclusive `NumberFormatException` do resolver → 400 via handler de `IllegalArgumentException`. Migrations V1–V4 não foram revisadas linha a linha (boot-verificadas em runtime conforme `tasks.md`).

### 🟡 BE-1 (Média) — Convite por EMAIL não é vinculado ao e-mail convidado
- **Onde**: `services/PlanInvitationService.java:69` (`accept(String token, User actor)`) — cria membership para **qualquer** usuário autenticado, sem checar `actor.getEmail() == invitation.getEmail()` para convites do tipo EMAIL.
- **Problema**: o design especifica "EMAIL = single-use token **bound to email**+role". Hoje um token de convite por e-mail (se encaminhado/vazado) pode ser resgatado por qualquer conta logada; o campo `email` vira decorativo. Risco real baixo (token é UUID não-adivinhável), mas diverge do modelo de segurança declarado.
- **Correção sugerida**: em `accept`, para `type == EMAIL`, exigir que o e-mail do `actor` bata com `invitation.getEmail()` (senão `InvitationInvalidException`).
- **Status**: ✅

### 🟡 BE-2 (Média) — `transferOwnership` sem guarda para alvo == requester (auto-rebaixamento)
- **Onde**: `services/PlanService.java:164-180`.
- **Problema**: se `newOwnerUserId` for o próprio owner, `getMembership(requester)` e `findByPlanAndUser(plan, targetUser)` carregam a **mesma linha** em duas instâncias; seta OWNER e depois `demotedRole` (EDITOR) — o último save vence, o owner se rebaixa e o plano fica **sem nenhum owner**. A UI evita (filtra owners dos candidatos), mas não há guarda server-side.
- **Correção sugerida**: rejeitar `targetUser.getId() == requester.getId()` (e/ou alvo já OWNER) com erro claro.
- **Status**: ✅

### 🟡 BE-3 (Média) — Preview de convite exige auth → bloqueia convidado novo (par do FE-1)
- **Onde**: `config/SecurityConfig.java:50` (`.anyRequest().authenticated()`) cobre `GET /api/finsight/invitations/{token}`; `controllers/PlanInvitationController.java:64`.
- **Problema**: um convidado sem conta não consegue nem **pré-visualizar** o convite (403 anônimo). Combinado com FE-1, o fluxo "registrar → cair na aceitação" do spec (PLAN-04 AC2 / Edge Cases) fica inviável. `tasks.md` T52 já sinalizou o 403 anônimo.
- **Correção sugerida**: tornar `GET /invitations/{token}` público (`permitAll`) para o preview antes do registro; manter `accept` autenticado. Alinhar com a correção de FE-1 (retorno pós-login).
- **Status**: ✅

### 🟢 BE-4 (Baixa) — Semântica de multi-owner meio-suportada
- **Onde**: `services/PlanService.java:153-162` (`leavePlan`) e `:97-111` (`changeMemberRole`).
- **Problema**: `changeMemberRole` aceita `newRole == OWNER` (cria 2º owner sem rebaixar o requester), mas `leavePlan` lança `LastOwnerException` para **qualquer** owner independentemente da contagem — mensagem "transfira a propriedade" é enganosa quando há outros owners. O spec só manda bloquear o **último** owner. Impacto real baixo (UI nunca cria 2º owner, pois `ROLE_OPTIONS` exclui OWNER), mas a lógica é inconsistente.
- **Correção sugerida**: decidir se multi-owner é suportado. Se sim, `leavePlan` deve usar `requireNotLastOwner(plan)` em vez de bloquear todo owner. Se não, impedir `changeMemberRole` de promover a OWNER.
- **Status**: ✅ (decisão: não suportado — `changeMemberRole` agora rejeita `newRole == OWNER`)

### 🟢 BE-5 (Baixa) — Import CSV: `catch (Exception) → RuntimeException` vira 500 genérico
- **Onde**: `services/FinancialTransactionService.java:258-260`.
- **Problema**: linha malformada (data/número inválido) resulta em 500 com mensagem genérica em vez de 400; perde o detalhe do erro. Padrão pré-existente, mas o método foi tocado no re-escopo.
- **Correção sugerida**: validar/pular linhas inválidas ou mapear para um erro 400 de importação.
- **Status**: ✅

### 🟢 BE-6 (Baixa) — `getPlans` com N+1 potencial
- **Onde**: `controllers/PlanController.java:52` + `PlanResponseDto::new` lendo `membership.getPlan()` (lazy) por item.
- **Problema**: 1 query para memberships + N para os planos. Insignificante hoje (poucos planos por usuário), mas é um padrão a observar.
- **Correção sugerida**: `join fetch` em `findAllByUser` se a lista crescer.
- **Status**: ✅

### 🟢 BE-7 (Observação) — Cobertura de teste dos guardas críticos
- **Contexto**: só `PlanAuthorization` (lógica pura) e o gerador têm testes unitários. Guardas server-side de maior risco (vínculo de e-mail BE-1, auto-transferência BE-2, last-owner/last-plan) só foram verificados por E2E manual — sem teste automatizado que trave regressão. Coerente com a filosofia de teste do projeto (sem infra de teste de integração), mas fica como risco residual a considerar quando/se a infra de teste existir.
- **Status**: ⬜

---

## Melhorias (novos itens do pacote de ajustes)

### ✨ ENH-1 — Mostrar (e talvez selecionar) o titular da despesa na UI
- **Motivação (usuário, 2026-07-12)**: hoje a tabela de transações não mostra a qual pessoa a despesa se refere. Em um plano compartilhado, é importante saber de quem é cada lançamento. Ideia adicional: **poder selecionar/reatribuir** o titular, dependendo da permissão.
- **Estado atual (verificado)**: o dado de autoria **já existe ponta a ponta** — backend expõe `createdBy` (id+nome) em `FinancialTransactionResponseDto` (`CreatedByDto`) e o tipo FE `FinancialTransaction.createdBy?` já está definido. Porém **nenhum componente FE consome** (`grep createdBy` em `features/` = 0 usos). O dado chega e é ignorado.
- **⚠️ Depende de DEC-1** (ver abaixo): `createdBy` != titular da despesa. A Parte 2 deve editar o campo de **titularidade** (`attributedTo`), não `createdBy`.
- **Parte 1 — exibir (pequeno, só frontend)**: adicionar uma coluna/indicador de titular em `features/home/components/transactions/transactionColumns.tsx` (ex.: avatar com iniciais via `getFirstAndLastInitials` + nome, reaproveitando o padrão do `PlanMembersList`). Considerar esconder a coluna quando o plano tem só 1 membro (ruído desnecessário no plano pessoal). Enquanto DEC-1 não for implementado, exibir `createdBy` (coincide com o titular hoje).
- **Parte 2 — selecionar/reatribuir (maior, full-stack, stretch)**: permitir que OWNER/EDITOR defina/altere o **titular** de um lançamento. **Bloqueada por DEC-1.**
  - Backend: `create`/`update` aceitariam um `attributedToId` opcional, **gated por role** via `PlanAuthorization`. Validar que o alvo é membro do plano. `createdBy` permanece imutável (`ctx.getUser()`).
  - Frontend: campo de seleção de membro no `TransactionFormDrawer`, visível conforme `myRole`.
  - Decidir regra: CONTRIBUTOR provavelmente só atribui a si mesmo; EDITOR/OWNER podem atribuir a outro membro. Definir na fase de design.
- **Status**: ⬜

### 🧩 DEC-1 (Decisão de design) — Separar "quem lançou" de "de quem é a despesa"
- **Problema (usuário, 2026-07-12)**: hoje `createdBy` carrega dois significados sobrepostos que só coincidem porque não dá pra lançar em nome de outra pessoa: (1) **autoria/auditoria** — quem digitou o registro (imutável); (2) **titularidade** — de quem é a despesa (o que o breakdown por pessoa quer mostrar e o que o ENH-1 quer selecionar). Ao habilitar "minha esposa comprou isso", eles divergem.
- **Por que importa**: reusar `createdBy` para titularidade quebra (a) **Autorização Layer 2** — `requireCanModifyTransaction` usa `createdBy == actor` como dono da linha; reatribuir faria o autor perder o direito de editar o próprio lançamento; (b) **auditoria** — perde-se o rastro de quem digitou.
- **Recomendação**: introduzir campo distinto **`attributedTo`** (nome provisório; alternativas: `incurredBy`, `spentBy`, `paidBy` — este último é enviesado a despesa e a transação também pode ser CREDIT).
  - `createdBy`: imutável, carimbado no create, usado por autorização + auditoria.
  - `attributedTo`: mutável (gated por role), usado pelo breakdown por pessoa e pelo seletor do ENH-1.
  - Default `attributedTo = createdBy` quando não informado.
- **Impactos**:
  - **Migration** (nova coluna `attributed_to` + FK; backfill `attributed_to := created_by`).
  - **PLAN-08**: `findPersonBreakdown` hoje agrupa por `createdBy` ("por quem lançou"); deve passar a agrupar por `attributed_to` ("de quem é o gasto") para ficar semanticamente correto.
  - **DTO/tipos**: adicionar `attributedTo` (id+nome) ao response + tipo FE.
  - Entidade `FinancialTransaction`, `FinancialTransactionService.create/update`, gerador de recorrentes (carimbar `attributedTo` junto).
- **Decisões em aberto**: (a) nome do campo; (b) repontar PLAN-08 agora ou depois; (c) matriz de quem pode atribuir a quem por role.
- **⚠️ Acoplado a DEC-2**: `attributedTo` (uma pessoa) é o caso degenerado de um rateio (N participações). Não fechar o schema de DEC-1 sem uma direção sobre DEC-2, sob risco de migrar duas vezes.
- **🔎 Análise concluída (2026-07-12, ver `research-shared-expenses.md`)**: recomendação é **não** criar coluna `attributed_to` própria — a titularidade é **subsumida pela tabela de participações** de DEC-2 (participação única de 100% = despesa pessoal). `createdBy` permanece imutável (autoria + Layer-2).
- **✅ DECIDIDO (2026-07-12, usuário)**: sem coluna `attributed_to`; titularidade = participação (ver DEC-2). Pronto para design.
- **Status**: ✅ (decidido — implementar junto com DEC-2)

### 🧩 DEC-2 (Decisão de design / precisa de análise) — Despesas compartilhadas / rateio
- **Problema (usuário, 2026-07-12)**: e uma despesa dividida entre membros? Ex.: aluguel que cada um paga metade. Como modelar sem "reinventar a roda"?
- **Insight-chave**: DEC-1 é caso particular de DEC-2. Uma despesa normal = 100% para uma pessoa; aluguel = 50%/50%. Modelar só `attributedTo` (uma pessoa) agora e depois querer rateio ⇒ **duas migrações**. Logo DEC-1 não deve ser fechado sem uma direção de DEC-2.
- **Prior art (resumo; análise aprofundada pendente)**:
  - **Splitwise / Tricount / Settle Up** (rastreador de dívida): 1 despesa = `total` + pagador + **N participações** (igual / valores exatos / % / cotas) → calcula saldos líquidos "quem deve a quem". A ideia do usuário de "duas despesas separadas" é uma simplificação disso que perde o vínculo (é um evento só) e a dívida.
  - **YNAB**: "split" é **entre categorias**, não entre pessoas — eixo diferente.
  - **Monarch / Copilot** (casais): transação marcada como compartilhada com "sua parte" (%/50-50); foco em orçamento, não em quitar dívida.
- **Pergunta de enquadramento (decide o modelo)**: o finSight é **orçamento** ("pra onde foi o dinheiro") ou **acerto de contas** ("quem deve a quem")? Os dashboards / limites por categoria / breakdown por pessoa sugerem **budgeting-first** ⇒ provavelmente basta **cotas de participação** que alimentam o breakdown, **sem** ledger de dívida (bem mais simples que Splitwise). A confirmar na análise.
- **Opções de modelo**:
  - **A — Splits/participações (Splitwise-like)**: 1 transação com `total` + coleção de `{member, share}` (valor ou %). Breakdown soma a cota de cada um. Flexível; participação única de 100% = despesa pessoal (subsume DEC-1).
  - **B — N transações separadas** (ideia do usuário): simples, reusa o modelo atual + `attributedTo`; perde o vínculo do evento único, dedup e edição conjunta. Poderia ligar via um `groupId`.
  - **C — % simples numa transação** (rateio igualitário implícito): meio-termo leve.
  - **D — Ledger de dívida completo** (settlement): só se o enquadramento for "acerto de contas".
- **Recomendação de processo**: fazer a **análise de prior art dedicada** (Splitwise, Tricount, Settle Up, YNAB, Monarch, Copilot, double-entry) **antes** de commitar o schema de DEC-1. Provavelmente modelar **participações** desde já (Opção A), tratando a despesa pessoal como participação única — evita a dupla migração.
- **✅ Análise concluída (2026-07-12)** → `research-shared-expenses.md` (deep research citado + mapa do código atual). Conclusões:
  - **Enquadramento respondido**: finSight é **orçamento**, não acerto de contas (confirmado pelo código: limites por categoria, breakdown income/expense/net, zero superfície de dívida). Alinha com Monarch/Copilot; distinto de Splitwise/Tricount/Settle Up.
  - **Recomendação: Opção A (participações), variante SEM ledger de dívida.** 1 transação + N linhas `{membro, cota}`; despesa pessoal = participação única 100% (subsume DEC-1). Não construir `Debts`/settle-up/simplificação — nenhum app de orçamento pesquisado o faz.
  - **Schema**: tabela `transaction_participants {transaction_id, member_user_id, share_amount}` (valor resolvido; soma = amount) + `split_mode` opcional. Backfill = 1 participação 100% p/ o autor.
  - **Impactos mapeados**: V5 migration, entidade, create/update, gerador de recorrentes, PLAN-08 (`GROUP BY` passa de `created_by` → participante), DTOs+tipos FE, matriz de autorização.
  - **Pendências p/ o usuário** (§5 do doc): confirmar enquadramento, storage (resolvido vs peso), modos de split no MVP, naming, sequência do PLAN-08, matriz de role.
- **✅ DECIDIDO (2026-07-12, usuário)**:
  - **Modelo**: Opção A — participações, **sem** ledger de dívida (subsume DEC-1).
  - **Storage**: `share_amount` resolvido **+** coluna `split_mode` (`EQUAL`/`EXACT`/`PERCENT`) na transação. `%` é modo de entrada (resolvido no write) ⇒ adicionar `%` no futuro **não exige migração**.
  - **Autorização**: só **EDITOR/OWNER** rateiam entre membros; **CONTRIBUTOR** só lança despesa própria (100% pra si), não rateia. `createdBy` imutável.
  - **Modos MVP**: igual + valor exato; `%` depois. **Naming**: `transaction_participants {transaction_id, member_user_id, share_amount}`. **PLAN-08**: repontar junto (fazer uma vez).
- **Status**: ✅ (decidido — pronto para a fase de design SDD de ENH-1 + DEC-1/DEC-2 + PLAN-08)

---

## Ordem sugerida

As correções são **independentes** do modelo de atribuição/rateio → vêm primeiro e reduzem risco já. A análise de DEC-2/DEC-1 **não tem dependência de código** (pode rodar em paralelo), mas **bloqueia o ENH-1** — que por isso sai da fase de correção. Regra rígida: **implementar ENH-1 só depois de DEC-2 → DEC-1.**

### Fase A — Correções (independentes; aplicar primeiro)
1. **FE-1 + BE-3 juntos** — fluxo de convite para usuário novo (front perde o token no redirect; back exige auth no preview). Maior impacto; mesmo buraco nas duas pontas.
2. **BE-1, BE-2** — segurança/semântica (vínculo de e-mail do convite; guarda de auto-transferência).
3. **FE-2, FE-3, FE-4** — layering do `PlanProvider`, memoização do context, tipagem das chamadas axios.
4. **Lote de baixas** — FE-5..FE-9, BE-4..BE-6.
5. **SKILL-1** — revisar texto da skill de container.

### Fase B — Atribuição/rateio (gated pela análise; depois)
6. **Análise de prior art (DEC-2)** — sem código; pode começar em paralelo à Fase A.
7. **Decisão de enquadramento** (orçamento vs acerto de contas) + **modelo** (A–D) + **DEC-1** (schema definitivo: `attributedTo` ou participações).
8. **ENH-1 (Partes 1 e 2)** + repontar **PLAN-08** — construir a superfície de titular/rateio uma vez, contra o campo certo. Exibir `createdBy` como "titular" antes disso seria semanticamente errado.
