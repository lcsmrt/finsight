---
name: backend-exceptions
description: Add or wire a domain exception in a layered Spring Boot API — define a typed exception and map it to an RFC 7807 ProblemDetail response through one central @RestControllerAdvice. Covers per-domain exception containers, naming, the status taxonomy, one-exception-per-semantic, ProblemDetail with own type URIs, and field-validation errors as an `errors` extension. Use when adding a new error condition or exception type, or changing error-to-status/response mapping. For building the endpoint itself, use /backend-endpoint. Triggers on "exception", "error handling", "ControllerAdvice", "GlobalExceptionHandler", "ProblemDetail", "error response", "not found exception", "validation error", "HTTP status mapping".
metadata:
  type: reference
---

# Backend Exceptions

Domain errors are **typed exceptions** thrown from the service layer and mapped to HTTP responses in **one
central place** — a `@RestControllerAdvice`. Response bodies use **RFC 7807 `ProblemDetail`**
(`application/problem+json`). Never put HTTP status on the exception class (`@ResponseStatus`), and never
handle errors in controllers.

> Names below (`Product`, URIs) are placeholders — adapt to the project. The `type`-URI scheme and the
> `errors` extension name are project conventions (see `CLAUDE.md`).

## 1. Define the exception

- One `XxxExceptions` container per domain, holding `static` nested `RuntimeException` subclasses.
- Name `<Entity><Condition>Exception` (`ProductNotFoundException`, `ProductAlreadyExistsException`).
- **One exception per semantic** — distinct meaning/status ⇒ distinct type; the same error with variable
  data ⇒ one type parameterized. Never reuse an exception whose message/meaning is written for another
  context (that couples two behaviors to one class and leaks the wrong message).

```java
public class ProductExceptions {
    public static class ProductNotFoundException extends RuntimeException {
        public ProductNotFoundException(Long id) {
            super("Product not found for id " + id + ".");
        }
    }
    public static class ProductAlreadyExistsException extends RuntimeException {
        public ProductAlreadyExistsException(String name) {
            super("A product named '" + name + "' already exists.");
        }
    }
}
```

## 2. Choose the status

| Condition                                                     | Status |
| ------------------------------------------------------------ | ------ |
| Resource missing / hidden for privacy                        | `404`  |
| Authenticated but not allowed (action on a visible resource) | `403`  |
| State conflict (duplicate, last-owner, ...)                  | `409`  |
| Invalid input / broken invariant                             | `400`  |
| Gone (expired, consumed)                                     | `410`  |

To deny access to a resource whose existence shouldn't leak, use `404`, not `403` (see /backend-endpoint).

## 3. Map it centrally → ProblemDetail

In the single `@RestControllerAdvice extends ResponseEntityExceptionHandler`, add an `@ExceptionHandler`
returning a `ProblemDetail`. Set an own `type` URI + `title`; Spring fills `status`, `instance`, and the
`application/problem+json` content type. Extending `ResponseEntityExceptionHandler` means Spring's own MVC
exceptions already return `ProblemDetail` too — keep everything consistent, don't shadow them.

```java
@ExceptionHandler(ProductExceptions.ProductNotFoundException.class)
public ProblemDetail handleProductNotFound(ProductExceptions.ProductNotFoundException ex) {
    ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    pd.setType(URI.create("https://<app>/problems/product-not-found"));
    pd.setTitle("Product not found");
    return pd;
}
```

- `type` — a **stable per-type URI**, `https://<app>/problems/<kebab-slug>` (one per problem type).
- `title` — a stable human label for the type ("Product not found").
- `detail` — the per-occurrence message (the exception's message).

Group exceptions that share a status + type under one handler where it reads cleanly.

## 4. Validation & generic input errors

Bean Validation failures → override `handleMethodArgumentNotValid`, returning a `400` `ProblemDetail` that
carries an **`errors` extension** (the project's chosen name; RFC 7807 leaves field errors unspecified):

```java
@Override
protected ResponseEntity<Object> handleMethodArgumentNotValid(
        MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
    List<Map<String, String>> errors = ex.getBindingResult().getFieldErrors().stream()
            .map(fe -> Map.of("field", fe.getField(), "message", fe.getDefaultMessage()))
            .toList();
    ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed.");
    pd.setType(URI.create("https://<app>/problems/validation-error"));
    pd.setTitle("Validation failed");
    pd.setProperty("errors", errors);
    return ResponseEntity.badRequest().body(pd);
}
```

Generic input errors thrown from the service → `IllegalArgumentException`, mapped to a `400` `ProblemDetail`.

## 5. Never reach the fallback

Every domain exception has an explicit handler. A catch-all `@ExceptionHandler(Exception.class)` → `500`
`ProblemDetail` exists only as a backstop — nothing domain-specific should fall through to it.

## Before done

- [ ] Exception is a nested type in the domain's `XxxExceptions`, named `<Entity><Condition>Exception`.
- [ ] Distinct semantic ⇒ distinct type; no reuse across different meanings.
- [ ] Central `@RestControllerAdvice` handler returns a `ProblemDetail` with an own `type` URI + `title`.
- [ ] Status matches the taxonomy; existence-hiding denials use `404`.
- [ ] Validation errors carry the `errors` extension; nothing falls through to the `500` backstop.
