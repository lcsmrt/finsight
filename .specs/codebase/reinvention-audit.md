# Auditoria "reinventar a roda" — finSight (backend + frontend)

**Data**: 2026-07-12
**Lente única**: onde o código resolve à mão um problema que uma biblioteca / recurso de framework / padrão consagrado já resolve — e, tão importante quanto, onde a "roda caseira" é **justificada**.
**Método**: 5 varreduras paralelas (backend web/segurança; backend service/dados/utils; frontend dados/estado; frontend UI/forms; deps/build/arquitetura), read-only, com evidência `file:line`.
**Escopo**: `/home/lcs/dev/finsight` — `backend/` (Spring Boot 3.5.3, Java 17, sem Lombok) e `frontend/` (React 19, Vite 6, TanStack Query/Table, RHF+zod, Base UI, cva).

---

## Veredito geral (a parte que importa)

**Você NÃO está reinventando a roda de forma preocupante.** O sistema é, na maior parte, **convenção pura**: backend Spring em camadas de manual + frontend React feature-oriented sobre bibliotecas mainstream e atuais. Não há invenções arquiteturais bespoke. Praticamente toda a "máquina pesada" (tabela, primitives de UI, forms, formatação, roteamento, paginação, filtros dinâmicos, money math, migrations) está apoiada na ferramenta certa.

Os achados são de **idioma e higiene**, não de arquitetura. Nenhum é um subsistema caseiro grande duplicando uma lib. Onde há código custom significativo (autorização por plano), ele é **justificado** — o framework não expressa o caso limpo.

Escala honesta: **1 item de porte médio** (JWT hand-rolled), **~4 itens de baixo esforço e boa alavancagem**, e **um punhado de polimentos triviais**. O resto é "deixe como está".

---

## O que vale mexer (ranqueado por alavancagem × custo)

### 🟠 R-1 — JWT parseado/validado à mão + filtro custom `[backend]`
- **Onde**: `security/JwtService.java:44-72`, `security/JwtAuthenticationFilter.java:28-66`.
- **Roda caseira**: filtro `OncePerRequestFilter` que extrai o Bearer, valida o token com `jjwt` e popula o `SecurityContext`. Além disso, **recarrega o usuário do banco a cada request** (`JwtAuthenticationFilter.java:47-49`).
- **Padrão**: Spring Security **OAuth2 Resource Server** (`spring-boot-starter-oauth2-resource-server`) → `http.oauth2ResourceServer(o -> o.jwt(...))` traz `BearerTokenAuthenticationFilter` + `NimbusJwtDecoder.withSecretKey` (valida assinatura/expiração) prontos. A identidade vem das claims verificadas, eliminando o `SELECT user` por request.
- **Veredito**: **REINVENTANDO — substituível.** Ressalva justa: é o padrão ubíquo de tutorial e **funciona**. Não é urgente; é o maior "poderia ser stock" do backend.
- **Esforço**: médio (~meio dia). Precisaria de um conversor claims→principal se quiser manter `CustomUserDetails`/`User` como principal (o `PlanContextArgumentResolver:62` depende disso).

### 🟡 R-2 — Boilerplate de invalidação copiado 18× `[frontend]` — **melhor custo-benefício**
- **Onde**: 18 call sites — `useFinancialTransactionService.ts:72-227`, `usePlanService.ts:88-260`, `useFinancialTransactionCategoryService.ts:64-130`, `useInvitationService.ts:91-131`.
- **Roda caseira**: cada mutation repete a mesma dança de 5 linhas (spread `...options`, sobrescreve `onSuccess`, chama `invalidateQueries`, e re-invoca à mão o `onSuccess` do usuário). Acontece porque `buildMutationOptions` remove `onSuccess`/`onError` dos defaults (`buildMutationOptions.ts:7-10`).
- **Padrão TanStack**: (a) `MutationCache({ onSuccess })` global lendo `meta.invalidates: QueryKey[]` de cada mutation; ou (b) estender `buildMutationOptions` para aceitar `invalidateKeys` e fazer o invalidate + encadeamento por dentro (ele já encadeia `onSuccess`/`onError` p/ toast em `:42,53`). Qualquer uma reduz os 18 sites a uma linha.
- **Veredito**: **REINVENTANDO — substituível.** Abstração ausente que a lib suporta diretamente.
- **Esforço**: médio (~1h p/ o mecanismo + varredura mecânica dos 18).

### 🟡 R-3 — Projeções `Object[]` posicionais no dashboard `[backend]`
- **Onde**: `FinancialTransactionRepository.java:43,55,65` retornam `List<Object[]>`; desempacotados por índice com casts em `DashboardService.java:62-66,84-88,107-111` (`(String) row[0]`, `(BigDecimal) row[3]`…).
- **Padrão**: **constructor/DTO projection** do Spring Data — `SELECT new com.lcs...CategoryRow(...)` ligando direto a um `record`. Idiomático e type-safe.
- **Veredito**: **REINVENTANDO — substituível (severidade menor).** Frágil: reordenar uma coluna do `SELECT` compila e quebra em runtime. Isolado a 3 queries.
- **Esforço**: baixo por query.

### 🟡 R-4 — DTOs de resposta como classes com ~215 acessores à mão `[backend]`
- **Onde**: `models/` + `dtos/` ≈ 1544 linhas / ~42 arquivos, das quais **215** são getters/setters/is. Os response DTOs (`FinancialTransactionResponseDto`, `PlanResponseDto`, `CategoryBreakdownDto`, `PagedResponseDto`…) já são imutáveis, campos `final`, construídos por construtor.
- **Padrão**: converter os ~12 response DTOs para **Java `record`** — **sem adicionar dependência** — apaga a maior parte dos 215 acessores. (Entidades JPA precisam continuar classes mutáveis; o boilerplate delas é inevitável.)
- **Veredito**: o "sem Lombok" é escolha deliberada e defensável; mas `record` é a vitória grátis. **JUSTIFICADO com um ganho fácil disponível.**
- **Esforço**: baixo-médio.
- **Nota relacionada**: os blocos de `set...` em `FinancialTransactionService.create` vs `update` (`:109-118` / `:124-145`) estão duplicados → um `applyDto(entity, dto)` privado resolve, sem lib.

### 🟢 R-5 — Re-fetch redundante do usuário nos controllers "sem contexto" `[backend]`
- **Onde**: `PlanController.java:41,51,63…`, `UserController.java:40`, `AuthenticationController.java:43`, `PlanInvitationController.java:74` — pegam `@AuthenticationPrincipal UserDetails` e então fazem `userService.findByEmail(userDetails.getUsername())`.
- **Padrão**: `@AuthenticationPrincipal CustomUserDetails` + `.getUser()` — a entidade `User` **já está** no principal (`CustomUserDetails.java:33-35`), exatamente como o argument resolver faz (`PlanContextArgumentResolver.java:62-64`). Elimina um `SELECT user` por request.
- **Veredito**: **MENOR** — subutiliza o principal tipado; inconsistente com o resolver que já faz certo.
- **Esforço**: trivial.

### 🟢 R-6 — GlobalExceptionHandler com mapeamento status repetido `[backend]`
- **Onde**: `exceptions/GlobalExceptionHandler.java:52-205` — ~12 handlers, cada um montando `ErrorResponseDto` e escolhendo status à mão.
- **Padrão**: `@ResponseStatus(HttpStatus.NOT_FOUND)` **na própria exceção** colapsa os handlers de puro status-mapping. (Opcional: `ProblemDetail`/RFC 7807.) A estrutura `@RestControllerAdvice` + override de `handleMethodArgumentNotValid` já está correta.
- **Veredito**: **MENOR** — só a repetição é reinvenção; o shape do DTO de erro é escolha de produto legítima.
- **Esforço**: baixo.

### 🟢 R-7 — Dependências mortas e automação não-ligada `[frontend]`
- **Onde**: `package.json`, `eslint.config.js`.
  - `tailwindcss-animate` (`:68`) — morta (projeto está em Tailwind v4 com `tw-animate-css`).
  - `@tanstack/react-query-devtools` (`:22`) — instalada, nunca montada.
  - **`eslint-plugin-check-file` + `eslint-plugin-import`** (`:55-56`) — instaladas mas **não referenciadas** no `eslint.config.js`. Você tem convenções estritas de nome/import documentadas (`CLAUDE.md`, `CONVENTIONS.md`) e **paga por ferramentas que as auto-imponham**, mas as impõe no braço/revisão.
- **Veredito**: **REINVENTANDO (você tem a automação, aplica manualmente)** no caso dos plugins ESLint; dead deps são higiene.
- **Esforço**: baixo (ligar os plugins com as regras que espelham as convenções, ou remover).

### 🟢 R-8 — Polimentos de idioma no frontend (todos baixos)
- **`watch()`+`setValue()` onde `Controller` do RHF encaixa** — `TransactionFormDrawer.tsx:279-347,356-364,520-524`. Re-renderiza o form inteiro a cada mudança; perde subscription por campo e touched/dirty. **Substituível.**
- **Tabs/toggles hand-rolled** — `HomePage.tsx:19-37`, `TransactionFormDrawer.tsx:376-416`, `TransactionTypeToggle.tsx`: `useState` + botões, sem `role`/`aria-selected`/navegação por seta. Base UI tem `tabs`/`toggle-group`. **Lacuna de a11y**, baixo esforço.
- **Debounce inline duplica o próprio hook** — `useTransactionFilters.ts:27-33` refaz `setTimeout`/`clearTimeout` embora `src/hooks/useDebounce.ts` exista. **Duplicação interna.**
- **Paginação sem `placeholderData: keepPreviousData`** — `useFinancialTransactionService.ts` (a plumbing de página em estado está **certa**; falta só a linha p/ não piscar entre páginas).
- **Flags de debug do TanStack Table ligadas** — `Table.tsx:66-68` (`debugTable/Headers/Columns: true`) → ruído no console em produção; gatear em dev.
- **401 sem tratamento** — interceptor de resposta é no-op (`finsightApi.ts:29-34`); token expirado não desloga/refresha. E `Navbar.tsx:21-24` desloga sem `setAccessToken(null)`, deixando o token em memória stale. *(Fora da lente pura, mas é uma lacuna real pequena.)*

### 🟢 R-9 — CSV import com `split(",", 4)` `[backend]`
- **Onde**: `FinancialTransactionService.java:213-246` + `catch(IOException) -> new RuntimeException` (`:218-220`).
- **Padrão**: OpenCSV / Commons-CSV (lida com aspas/vírgulas embutidas/escape/BOM). E lançar exceção **tipada** roteada pelo `GlobalExceptionHandler` em vez de `RuntimeException` genérica.
- **Veredito**: **MENOR e de baixo risco hoje** — o `split` só funciona porque o formato do Nubank tem a descrição livre como último campo. Se as fontes de import crescerem, aí sim uma lib CSV. O `catch->RuntimeException` é a parte reinventada (o projeto tem exceções tipadas). *(Já registrado como BE-5 no review de Shared Plans.)*

### 🔵 R-10 — Docs desatualizados (não é código, mas engana)
- `README.md:44-46`, `.specs/codebase/STACK.md:39`, `.specs/codebase/CONCERNS.md:7-13` ainda dizem **"No DB migration tool — schema via `ddl-auto=update`"** e marcam isso como concern **ALTO**. **Já foi resolvido**: `pom.xml` tem Flyway, `application.properties` usa `ddl-auto=validate`, e existem `V1..V4`. Doc drift. Também: `components.json` aponta Tailwind p/ `src/styles/globals.css`, mas o arquivo é `src/index.css`.

---

## Roda caseira **JUSTIFICADA** (não mexer — a parte tranquilizadora)

- **Autorização por plano** (`PlanContext` + `PlanAuthorization` + `PlanContextArgumentResolver`): roles são **por linha de plano**, não authorities globais — `hasRole(...)`/`@PreAuthorize` genuinamente não expressam. O resolver funde "verificar membership" + "prover plano/role/user" num lookup só. Regra CONTRIBUTOR-só-edita-a-própria-linha é exatamente o contexto por-linha que o Spring não faz declarativo. **Uso legítimo de `HandlerMethodArgumentResolver`.**
- **Money math com `BigDecimal`**: `compareTo(ZERO)`, `.abs()`, `.divide(x, 2, RoundingMode.HALF_UP)` — correto, incluindo a escala/arredondamento explícitos que a maioria erra. Lib de money (JSR-354) só compensaria com multi-moeda (não é o caso).
- **Gerador de recorrentes**: expandir a série em linhas persistidas via `java.time.plusMonths` com cap de 120 é domínio legítimo — Quartz/rules engine resolvem outro problema.
- **Sem Lombok**: escolha deliberada e coerente (sem annotation-processor, código explícito); custo bounded (~215 linhas triviais). Se o mapeamento crescer, MapStruct é o próximo passo convencional — não mais mapa à mão.
- **Wrapper de service-hook (frontend)**: camada fina de convenção (centraliza toast + invalidação), **não** re-implementa nada do TanStack; genuinamente reusada nos 6 services.
- **Providers em context puro** (`AuthProvider`/`PlanProvider`): caso clássico "baixa frequência, tree-wide, derivado de server-state" — context é a escolha certa, não um state lib.
- **Utils pequenos**: `cn()` = clsx+tailwind-merge (canônico), `useDebounce`, `storage.ts`, `getFirstAndLastInitials`, formatação via `Intl`/`date-fns` — todos apoiados na plataforma/lib certa, sem grab-bag caseiro.
- **Mapeamento DTO à mão na escala atual**: ~12 DTOs, cada um mapeado em 1 lugar, vários com lógica real (null-guard, campos derivados) — MapStruct pagaria pouco aqui.
- **Paginação/filtro**: `PagedResponseDto` embrulha `Page` do Spring (não re-deriva math); `JpaSpecificationExecutor` + `Specification` p/ filtros dinâmicos; whitelist de sort-field contra injeção (`PaginatedFilterDto:31-36`) — value-add real que o Spring não dá de graça.
- **Tabela/forms/roteamento (frontend)**: TanStack Table, RHF+zod, React Router v7, Base UI — tudo idiomático.

---

## Sequência sugerida (se quiser agir)

1. **Baratos e de alto valor primeiro**: R-5 (trocar tipo do principal), R-7 (ligar ESLint plugins + remover dead deps), R-10 (atualizar docs), R-8 debug flags + `keepPreviousData`. — poucas horas no total.
2. **Alavancagem**: R-2 (centralizar invalidação, apaga 18 cópias) e R-3 (projeções tipadas). R-4 (DTOs → records) junto, se for tocar os DTOs para DEC-1/DEC-2 de qualquer forma.
3. **Higiene de robustez**: R-8 (401 handling / logout limpar token) e R-9 (exceção tipada no CSV).
4. **Opcional / maior**: R-1 (migrar p/ OAuth2 Resource Server) — só se quiser reduzir superfície de segurança custom; funciona bem hoje.
5. **R-6** e o resto: quando conveniente.

> Nada aqui bloqueia a Fase B (despesa compartilhada). São itens independentes e incrementais.
