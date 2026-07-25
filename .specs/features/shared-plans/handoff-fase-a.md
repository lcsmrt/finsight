# Handoff — Fase A: Correções (Shared Plans)

**Objetivo**: aplicar as correções de bug/segurança/higiene do code review da feature de compartilhamento de planos. **Não** tocar em atribuição/rateio (isso é Fase B, ver `handoff-research.md`).

**Fonte da verdade dos achados**: `.specs/features/shared-plans/review.md` (cada item tem `file:line` e correção sugerida). Este handoff é o roteiro de execução; consulte o `review.md` para o detalhe completo de cada ID.

---

## Contexto mínimo

- Monorepo em `/home/lcs/dev/finsight`: `finsight-frontend/` (React+TS, Vite) e `finsight-backend/` (Spring Boot 3.5, Java, sem Lombok).
- A feature (spec/design/tasks) está em `.specs/features/shared-plans/`. Backend já foi verificado por E2E; estas são correções pós-review.
- Convenções: skills em `.claude/skills/` (`api-integration`, `component-creation`, `feature-structure`, `form-creation`) + `finsight-frontend/CLAUDE.md` + `.specs/codebase/CONVENTIONS.md`. **Siga-as.**
- Nota de convenção já decidida: escolha de container (Dialog/Sheet/Page) é por caso de uso/tamanho, **não** regra rígida — não "corrigir" forms pequenos em Dialog.

## Gates (rodar antes de considerar cada item pronto)
- Frontend: `cd finsight-frontend && npm run lint && npm run build`
- Backend: `cd finsight-backend && ./mvnw -q -DskipTests package` (compila sem DB)
- Baseline de lint FE tem erros pré-existentes; não regredir, não precisa zerar.

## Escopo — NÃO FAZER nesta fase
- ENH-1 (exibir/selecionar titular), DEC-1 (`attributedTo`), DEC-2 (rateio), repontar PLAN-08. Tudo isso é Fase B e depende de análise.

---

## Ordem de execução

### 1. FE-1 + BE-3 juntos — fluxo de convite para usuário novo (maior impacto)
Mesmo buraco nas duas pontas:
- **FE-1**: `/invitations/:token` está dentro de `<PrivateRoute>` (`src/app/routing/AppRouter.tsx:25`), que faz `<Navigate to="/login" />` sem preservar destino (`src/app/routing/PrivateRoute.tsx:5`); `LoginPage.tsx:49` sempre vai pra `PATHS.home`. Resultado: convidado deslogado perde o token ao logar.
  - Preservar `location` no redirect (`state={{ from: location }}`), consumir `from` no `LoginPage`/`RegisterUserPage`, garantir que o token sobreviva ao registro/login.
- **BE-3**: `GET /api/finsight/invitations/{token}` (preview) cai em `.anyRequest().authenticated()` (`config/SecurityConfig.java:50`) → 403 anônimo.
  - Tornar o **preview** público (`permitAll`) em `SecurityConfig`; manter `accept` autenticado.
- Verificar ponta a ponta: usuário sem conta abre link → vê preview → registra/loga → cai na aceitação.

### 2. BE-1, BE-2 — segurança/semântica
- **BE-1**: `services/PlanInvitationService.java:69` `accept(token, actor)` não vincula convite EMAIL ao e-mail convidado. Para `type == EMAIL`, exigir `actor.getEmail() == invitation.getEmail()` (senão `InvitationInvalidException`).
- **BE-2**: `services/PlanService.java:164` `transferOwnership` sem guarda para alvo == requester → auto-rebaixamento deixa o plano sem owner. Rejeitar `targetUser.getId() == requester.getId()` (e/ou alvo já OWNER).

### 3. FE-2, FE-3, FE-4 — qualidade frontend
- **FE-2**: mover `PlanProvider` de `features/plans/` para `src/app/providers/` (ao lado de `AuthProvider`) para remover o acoplamento `api → feature`. Atualizar imports em `useFinancialTransactionService.ts:18`, `useDashboardService.ts:5`, `useFinancialTransactionCategoryService.ts:16` e demais consumidores.
- **FE-3**: em `PlanProvider`, `useCallback` no `setActivePlanId` + `useMemo` no `value` do context.
- **FE-4**: tipar respostas axios em `useInvitationService.ts` (`.get<InvitationPreview>`, `.post<Invitation>`, etc.) — remover o `any` silencioso.

### 4. Lote de baixas
- **FE-5**: padronizar idioma dos toasts (provavelmente PT) — hoje mistura PT/EN entre services.
- **FE-6**: `InvitePlanDialog.tsx:35` — enum zod `role` não deve incluir `"OWNER"` (alinhar a `ROLE_OPTIONS`).
- **FE-7**: `PlansPage.tsx:49-50` — remover `canInvite` (idêntico a `isOwner`).
- **FE-8**: `InvitePlanDialog.tsx:170,189` — `setValue(..., { shouldValidate: true })`; reduzir casts `as`.
- **FE-9**: `PlansPage.tsx` — desabilitar/loading nos botões destrutivos (arquivar/sair) usando `isPending`.
- **BE-4**: decidir semântica multi-owner. Se não suportar: impedir `changeMemberRole` de promover a OWNER. Se suportar: `leavePlan` usa `requireNotLastOwner(plan)` em vez de bloquear todo owner (`services/PlanService.java:153-162`, `:97-111`).
- **BE-5**: `services/FinancialTransactionService.java:258-260` — import CSV não deve virar 500 genérico em linha malformada; validar/pular linha ou mapear 400.
- **BE-6**: `getPlans` N+1 (`PlanController.java:52` + `PlanResponseDto::new`) — `join fetch` em `findAllByUser` se quiser resolver (baixíssima prioridade).

### 5. SKILL-1 — revisar texto da skill de container
- Ajustar `component-creation`/`form-creation` (em `.claude/skills/` e origem em `~/dev/mindmap`) para descrever Dialog/Sheet/Page como espectro por caso de uso/tamanho, não proibir CRUD em Dialog.

---

## Commits
- Atômicos, um por item (ou por par acoplado FE-1+BE-3). Seguir o estilo de mensagem já usado na feature (`feat(...)`, `fix(...)`, `refactor(...)`).
- Ao concluir, marcar cada ID como ✅ no `review.md`.
