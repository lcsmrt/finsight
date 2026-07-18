import { describe, expect, it } from "vitest";
import { createPlanSchema } from "./CreatePlanDialog";

describe("createPlanSchema", () => {
  it("accepts a valid plan name", () => {
    const result = createPlanSchema.safeParse({ name: "Household finances" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "Household finances" });
    }
  });

  it("rejects an empty name", () => {
    const result = createPlanSchema.safeParse({ name: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Enter a name for the plan",
      );
    }
  });

  it("rejects a missing name field", () => {
    const result = createPlanSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("throws when parsing invalid input directly", () => {
    expect(() => createPlanSchema.parse({ name: "" })).toThrow();
  });

  it("does not throw when parsing valid input directly", () => {
    expect(() => createPlanSchema.parse({ name: "Vacation fund" })).not.toThrow();
  });
});
