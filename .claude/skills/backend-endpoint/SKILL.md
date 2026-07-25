---
name: backend-endpoint
description: Create or modify a REST endpoint in a layered Spring Boot API as a vertical slice — controller → service → repository → request/response DTOs. Covers routing constants, status codes, identity resolution + service-layer authorization, @Valid, @Transactional, immutable hand-mapped response DTOs, paginated filtering with JPA Specifications, and typed exceptions. Use when adding or changing any endpoint or its service/repository/DTO layers. For adding or wiring a domain exception, use /backend-exceptions. Triggers on "backend endpoint", "new endpoint", "controller", "service method", "REST API", "add route", "repository query", "request DTO", "response DTO".
metadata:
  type: reference
---

# Backend Endpoint

A backend change is a **vertical slice**: `controller → service → repository → DTOs`. Keep the layer
boundary strict — the controller resolves identity + delegates + wraps a response DTO; the service owns
business logic, transactions, and authorization; the repository does data access only.

> Types and names below (`Product`, package paths) are **placeholders** — adapt them to the project.
> Framework conventions (Spring Boot, Bean Validation, `@ControllerAdvice`) are the point; the domain is
> illustrative. Project-specific rules (auth/tenancy model, base paths, business invariants) live in `CLAUDE.md`.

## Where things go

| Layer          | Package                | Naming                          |
| -------------- | ---------------------- | ------------------------------- |
| Route constant | `utils/ApiRoutes`      | `UPPER_SNAKE`, built from `BASE`|
| Controller     | `controllers/`         | `XxxController`                 |
| Service        | `services/`            | `XxxService`                    |
| Repository     | `repositories/`        | `XxxRepository`                 |
| Request DTO    | `dtos/request/`        | `XxxRequestDto`, `XxxFilterDto` |
| Response DTO   | `dtos/response/`       | `XxxResponseDto`                |
| Filter → query | `specifications/`      | `XxxSpecification`              |

## 1. Route

Add an `UPPER_SNAKE` constant built from a shared `BASE`; never inline a route literal in a controller.
Scoped/nested resources nest under their parent.

```java
public static final String BASE = "/api";
public static final String PRODUCT = BASE + "/products";
// nested: BASE + "/categories/{categoryId}/products"
```

## 2. Controller

- Constructor injection (`private final`, no field `@Autowired`, no Lombok).
- Document with `@Tag` (class) + `@Operation` (method).
- **Status:** `201` create (`HttpStatus.CREATED`), `204` delete (`.noContent()`), `200` read/update (`.ok(...)`).
- `@Valid` on every `@RequestBody`.
- **Identity:** resolve the authenticated principal via `@AuthenticationPrincipal`, or inject a scoped-access
  context via a custom `HandlerMethodArgumentResolver` for scoped endpoints. **Authorize in the service**, not here.
- **Param order:** `@PathVariable`(s) → body/query DTO → identity/context parameter **last**.
- **No business logic.** Pass **ids (`Long`)**, not resolved entities, to the service when the entity isn't
  needed — so resolution + authorization happen inside the service transaction.

```java
@Operation(summary = "Creates a product")
@PostMapping
public ResponseEntity<ProductResponseDto> create(
        @RequestBody @Valid ProductRequestDto dto,
        @AuthenticationPrincipal UserDetails principal) {
    Product product = productService.create(dto, principal.getUsername());
    return ResponseEntity.status(HttpStatus.CREATED).body(new ProductResponseDto(product));
}
```

## 3. Service

- `@Transactional` on mutations; `@Transactional(readOnly = true)` on reads.
- **Authorize in the service.** Run the authorization check **before** touching target data.
- **Security — status choice:** deny access to a resource the caller shouldn't know exists with `404`
  (not `403`) to avoid leaking existence; when the caller *can* already see the resource but may not perform
  the action, use `403`.
- **Scoping:** in a tenant/owner-scoped app, scope every query to the caller — never a bare global lookup.
- Throw typed domain exceptions (`XxxExceptions`); generic input errors → `IllegalArgumentException` (`400`).
- Accept `Long` ids for *target* entities and resolve them via the repository **after** authorizing.

```java
@Transactional
public void delete(Long id, String requesterEmail) {
    Product product = productRepository.findByIdAndOwnerEmail(id, requesterEmail)
            .orElseThrow(() -> new ProductExceptions.ProductNotFoundException(id)); // 404 hides existence
    productRepository.delete(product);
}
```

## 4. Repository

- Extend `JpaRepository<Entity, Long>`; prefer **derived queries** (`findByIdAndOwnerEmail(...)`),
  `@Query` only when a derived name can't express it.
- **Scope user-data queries to the caller** (owner/tenant) — no bare global lookups.
- Dynamic filtering → a JPA `Specification`; query with a `Pageable` and wrap the page in a paged response DTO.

## 5. DTOs (map by hand — no Lombok, no MapStruct)

**Request** — plain POJO, Bean Validation with messages, getters only:
```java
public class ProductRequestDto {
    @NotBlank(message = "Name cannot be blank.")
    private String name;
    public String getName() { return name; }
}
```

**Filter** — `extends PaginatedFilterDto`, getters *and* setters (bound via `@ModelAttribute`), default sort
in the constructor. Take it in the controller as `@ParameterObject @ModelAttribute @Valid`:
```java
public class ProductFilterDto extends PaginatedFilterDto {
    private String status;
    public ProductFilterDto() { super("createdAt", "desc"); }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
```

**Response** — **immutable**: `final` fields set in a constructor that takes the entity; getters only; never
expose the entity:
```java
public class ProductResponseDto {
    private final Long id;
    private final String name;
    public ProductResponseDto(Product product) {
        this.id = product.getId();
        this.name = product.getName();
    }
    // getters
}
```
Collections: `list.stream().map(ProductResponseDto::new).toList()`.

## 6. Exceptions

Throw typed domain exceptions from the domain's `XxxExceptions`. To add a new one or wire it into
`GlobalExceptionHandler`, use **/backend-exceptions**.

## Before done

- [ ] Route is a constant built from `BASE`; scoped resources nest under their parent.
- [ ] Correct status: `201` create / `204` delete / `200` read-update (`HttpStatus.CREATED`, not raw `201`).
- [ ] `@Valid` on the body; identity param is **last**.
- [ ] Controller has no business logic; passes `Long` ids, not resolved target entities.
- [ ] Service: right `@Transactional`; authorization before data access; deny-hides-existence uses `404`.
- [ ] User-data queries scoped to the caller.
- [ ] Response DTO immutable, built from the entity; no Lombok/MapStruct.
- [ ] Security-sensitive path covered by an integration test.
