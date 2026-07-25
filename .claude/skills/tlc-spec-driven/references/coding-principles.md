# Coding Principles

Behavioral bias, not checklist. Read before every implementation.

---

## Before Coding

- State assumptions explicitly. If uncertain, ask.
- Multiple interpretations exist? Present all—don't pick silently.
- Simpler approach exists? Say so. Push back when warranted.
- Something unclear? Stop. Name what's confusing. Ask.
- User's approach seems wrong? Disagree honestly. Don't be sycophantic.

---

## During Implementation

### Simplicity

- No features beyond what was asked
- No abstractions for single-use code
- No "flexibility" or "configurability" not requested
- No error handling for impossible scenarios
- 200 lines that could be 50? Rewrite it.

### Comments

- Default to no inline comments. Well-named identifiers already say what code does.
- Add one ONLY when the WHY is non-obvious: a hidden constraint, a subtle invariant, a workaround for a specific bug, behavior that would surprise a reader.
- No narration ("this loops over X"), no section-divider banners (`// --- helpers ---`), no restating the assertion in a trailing comment.
- Integration tests documenting a real/discovered behavior gap are a legitimate exception — but keep it to the one line that states the surprising fact, not a walkthrough of how the test proves it.
- If removing a comment wouldn't confuse a future reader, don't write it.
- Exception — doc comments: a JSDoc (`/** ... */` in TS/JS) or Javadoc (`/** ... */` in Java) block on a function, method, class, or type is fine to write and keep even when it "just" restates params/return/purpose. It renders in IDE hover/autocomplete at every call site, which is value the WHY-only bar doesn't capture. This exception covers doc-comment blocks specifically — plain `//` narration right next to code is still held to the WHY-only bar above.

### Surgical Changes

- Don't "improve" adjacent code, comments, or formatting
- Don't refactor things that aren't broken
- Match existing style, even if you'd do differently
- Unrelated dead code noticed? Mention it—don't delete it
- Remove ONLY imports/variables/functions YOUR changes orphaned
- Don't remove pre-existing dead code unless asked

### Test Integrity

- NEVER weaken an existing test assertion to make it pass
- NEVER delete a test to reduce failure count
- NEVER use the test framework's skip/disable/pending mechanism to bypass a failing test
- NEVER modify tests written in the RED phase during GREEN phase
- If a test is genuinely wrong, STOP and confirm with the user before changing it
- Tests are the spec — implementation conforms to tests, not the other way around

### Goal-Driven

- Transform vague tasks into verifiable goals
- Multi-step work? State brief plan with verify checkpoints
- Every changed line must trace directly to user's request

---

## After Each Change

Ask: "Would senior engineer call this overcomplicated?"
If yes → simplify before proceeding.
