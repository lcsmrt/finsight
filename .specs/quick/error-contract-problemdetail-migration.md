# Migrate the error contract to RFC 7807 ProblemDetail

## Prompt to paste into a new chat

> Migrate finsight's HTTP error responses from the custom `ErrorResponseDto` to RFC 7807 `ProblemDetail`,
> across backend + frontend. This is a coordinated breaking contract change. Read
> `.specs/quick/error-contract-problemdetail-migration.md` for full context and the locked decisions,
> then plan and execute it.

## Why

finsight will gain more API consumers — a mobile front and a WhatsApp expense-input integration — beyond
today's single web front. A standardized, documented error contract (RFC 7807) means every client parses
errors the same way, and keeps the door open if the API is ever exposed to third parties. Doing it **now,
while the web front is the only consumer**, is the cheapest moment: one client to migrate instead of three.

It also fixes an existing inconsistency: `GlobalExceptionHandler extends ResponseEntityExceptionHandler`,
whose base already returns `ProblemDetail` for Spring's built-in exceptions (e.g. a bad path-variable type),
while the custom handlers return `ErrorResponseDto`. The API is currently **half-and-half**; this commits
to one.

## Locked decisions

- **Body format:** RFC 7807 `ProblemDetail` (`application/problem+json`).
- **`type`:** own URIs, `https://finsight.app/problems/<kebab-slug>`, one stable URI per problem type.
- **Field-validation errors:** carried under an **`errors`** extension property — a list of
  `{ field, message }`.
- Standard reflected in the `/backend-exceptions` skill; keep them in sync.

## Current state (backend)

- `exceptions/GlobalExceptionHandler.java` — `@ControllerAdvice extends ResponseEntityExceptionHandler`;
  custom `@ExceptionHandler` methods build `new ErrorResponseDto(message, path)` and return
  `ResponseEntity<ErrorResponseDto>`.
- `handleMethodArgumentNotValid` override → `ErrorResponseDto` with a `List<FieldErrorDto>` (400).
- DTOs `dtos/response/ErrorResponseDto.java` and `dtos/response/FieldErrorDto.java`.

## Backend steps

1. Make the advice a `@RestControllerAdvice` (keep `extends ResponseEntityExceptionHandler`) so handlers can
   return `ProblemDetail` directly.
2. Rewrite each custom `@ExceptionHandler` to return a `ProblemDetail` via
   `ProblemDetail.forStatusAndDetail(status, ex.getMessage())` + `setType(<own URI>)` + `setTitle(...)`.
   Preserve the existing status mapping (404/403/409/400/410).
3. Rewrite `handleMethodArgumentNotValid` → `400` `ProblemDetail` with the `errors` extension
   (`pd.setProperty("errors", [{field, message}, ...])`).
4. Also cover the handlers the base class currently produces with a default body (e.g.
   `MethodArgumentTypeMismatchException`) so every response is a consistent ProblemDetail (this closes the
   current leak).
5. Delete `ErrorResponseDto`; repurpose `FieldErrorDto` as the item shape of the `errors` extension, or
   inline it — decide during execution.
6. Keep the catch-all `Exception.class` handler as a `500` ProblemDetail backstop.

## Frontend steps (finsight-frontend)

The error body shape changes: `message` → `detail`, `fieldErrors` (or whatever the old shape was) → `errors`.
- Central: `src/api/utils/resolveErrorMessage.ts` — update to read `detail` (and `title` as fallback).
- Field errors: whatever maps server validation onto form fields — update to read the `errors` extension.
- Grep for reads of the old error fields before deleting the old shape; the frontend reads should be
  centralized, so the change is small.

## Tests

- Backend `*IT` that assert error bodies → update to the ProblemDetail shape (`status`, `detail`, `type`,
  `errors`).
- Frontend tests asserting error handling / toast messages → update to the new shape.

## Coordination

Breaking change — ship backend + frontend together (or version the error handling behind a flag briefly).
Since mobile/WhatsApp don't exist yet, no other client is affected.
