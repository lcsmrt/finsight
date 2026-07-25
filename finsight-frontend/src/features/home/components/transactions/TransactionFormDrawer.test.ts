import { describe, expect, it } from "vitest";
import { FinancialTransaction } from "@/api/dtos/financialTransaction";
import { maskCurrency } from "@/utils/string/masks";
import {
  TransactionFormValues,
  buildDefaultValues,
  toPayload,
  transactionFormSchema,
} from "./TransactionFormDrawer";

const validValues: TransactionFormValues = {
  type: "DEBIT",
  description: "Groceries",
  amount: maskCurrency("10000"),
  category: { id: 1, type: "DEBIT", description: "Food", spendingLimit: null },
  date: new Date(2026, 6, 1),
  recurring: false,
  seriesEdit: false,
  attributionMode: "ME",
  splitMode: "EQUAL",
  participants: [],
  items: [],
};

const baseTransaction: FinancialTransaction = {
  id: 42,
  type: "DEBIT",
  amount: 150.5,
  description: "Rent",
  startDate: "2026-07-01T00:00:00.000Z",
  endDate: "2026-07-01T00:00:00.000Z",
  splitMode: "EQUAL",
  participants: [],
  items: [
    {
      id: 1,
      description: "Base rent",
      amount: 150.5,
      quantity: 1,
    },
  ],
};

describe("transactionFormSchema — plain transaction validation", () => {
  it("accepts a fully valid transaction", () => {
    const result = transactionFormSchema.safeParse(validValues);
    expect(result.success).toBe(true);
  });

  it("rejects an empty description", () => {
    const result = transactionFormSchema.safeParse({
      ...validValues,
      description: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.find((i) => i.path[0] === "description")
          ?.message,
      ).toBe("Description is required");
    }
  });

  it("rejects a zero amount", () => {
    const result = transactionFormSchema.safeParse({
      ...validValues,
      amount: "R$ 0,00",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.find((i) => i.path[0] === "amount")?.message,
      ).toBe("Amount must be positive");
    }
  });

  it("rejects a missing date", () => {
    const withoutDate: Record<string, unknown> = { ...validValues };
    delete withoutDate.date;
    const result = transactionFormSchema.safeParse(withoutDate);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.find((i) => i.path[0] === "date")?.message,
      ).toBe("Date is required");
    }
  });

  it("rejects items whose total exceeds the transaction amount", () => {
    const result = transactionFormSchema.safeParse({
      ...validValues,
      amount: maskCurrency("10000"),
      items: [
        { description: "Item 1", amount: maskCurrency("6000") },
        { description: "Item 2", amount: maskCurrency("6000") },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.find((i) => i.path[0] === "items")?.message,
      ).toBe("Items cannot exceed the transaction total");
    }
  });

  it("rejects EXACT split shares that don't add up to the total", () => {
    const result = transactionFormSchema.safeParse({
      ...validValues,
      amount: maskCurrency("10000"),
      attributionMode: "SPLIT",
      splitMode: "EXACT",
      participants: [
        { memberId: 1, memberName: "Alice", shareAmount: maskCurrency("3000") },
        { memberId: 2, memberName: "Bob", shareAmount: maskCurrency("3000") },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.find((i) => i.path[0] === "participants")
          ?.message,
      ).toBe("Shares must add up to the total amount");
    }
  });
});

describe("buildDefaultValues — plain transaction", () => {
  it("returns create-mode defaults when no transaction is given", () => {
    const defaults = buildDefaultValues(undefined, 7, undefined);

    expect(defaults.type).toBe("DEBIT");
    expect(defaults.description).toBe("");
    expect(defaults.amount).toBe("");
    expect(defaults.category).toBeNull();
    expect(defaults.recurring).toBe(false);
    expect(defaults.seriesEdit).toBe(false);
    expect(defaults.attributionMode).toBe("ME");
    expect(defaults.splitMode).toBe("EQUAL");
    expect(defaults.participants).toEqual([]);
    expect(defaults.items).toEqual([]);
  });

  it("maps an existing transaction (non-series edit) into edit-mode defaults", () => {
    const defaults = buildDefaultValues(baseTransaction, 99, undefined);

    expect(defaults.description).toBe("Rent");
    expect(defaults.amount).toBe(maskCurrency("15050"));
    expect(defaults.seriesEdit).toBe(false);
    expect(defaults.recurrenceMode).toBeUndefined();
    expect(defaults.attributionMode).toBe("ME");
    expect(defaults.participants).toEqual([]);
    expect(defaults.items).toEqual([
      { description: "Base rent", amount: maskCurrency("15050"), category: null },
    ]);
    expect(defaults.date).toEqual(new Date(2026, 6, 1));
  });
});

describe("toPayload — plain transaction", () => {
  it("maps form values into the create/update request body", () => {
    const body = toPayload(validValues, false, undefined);

    expect(body).toEqual({
      type: "DEBIT",
      description: "Groceries",
      amount: 100,
      categoryId: 1,
      startDate: "2026-07-01",
      splitMode: undefined,
      participants: undefined,
      items: [],
    });
  });

  it("includes attribution when showAttribution is true", () => {
    const body = toPayload(validValues, true, 7);

    expect(body.participants).toEqual([{ memberId: 7 }]);
    expect(body.splitMode).toBe("EQUAL");
  });

  it("maps items with converted amounts and category ids", () => {
    const body = toPayload(
      {
        ...validValues,
        items: [
          {
            description: "Snacks",
            amount: maskCurrency("2500"),
            category: { id: 5, type: "DEBIT", description: "Food" },
          },
        ],
      },
      false,
      undefined,
    );

    expect(body.items).toEqual([
      { description: "Snacks", amount: 25, categoryId: 5 },
    ]);
  });
});

describe("edit-mode reset — plain transaction", () => {
  it("resets away from create-mode defaults once an existing transaction is provided", () => {
    const createDefaults = buildDefaultValues(undefined, 99, undefined);
    expect(createDefaults.description).toBe("");
    expect(createDefaults.amount).toBe("");

    const editDefaults = buildDefaultValues(baseTransaction, 99, undefined);
    expect(editDefaults.description).toBe("Rent");
    expect(editDefaults.amount).toBe(maskCurrency("15050"));
    expect(editDefaults).not.toEqual(createDefaults);
  });
});
