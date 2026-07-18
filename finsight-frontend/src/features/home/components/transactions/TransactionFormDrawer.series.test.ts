import { describe, expect, it } from "vitest";
import {
  FinancialTransaction,
  RecurrenceDefinitionResponse,
} from "@/api/dtos/financialTransaction";
import { maskCurrency } from "@/utils/string/masks";
import {
  TransactionFormValues,
  buildDefaultValues,
  toSeriesCreatePayload,
  toSeriesEditPayload,
  transactionFormSchema,
} from "./TransactionFormDrawer";

const baseValues: TransactionFormValues = {
  type: "DEBIT",
  description: "Rent",
  amount: maskCurrency("10000"),
  category: null,
  date: new Date(2026, 6, 1),
  recurring: true,
  seriesEdit: false,
  attributionMode: "ME",
  splitMode: "EQUAL",
  participants: [],
  items: [],
};

const installmentTransaction: FinancialTransaction = {
  id: 55,
  seriesId: "series-abc",
  type: "DEBIT",
  amount: 100,
  description: "Rent (3/12)",
  startDate: "2026-07-01T00:00:00.000Z",
  endDate: "2026-07-01T00:00:00.000Z",
  splitMode: "EQUAL",
  participants: [],
  items: [],
};

const installmentDefinition: RecurrenceDefinitionResponse = {
  id: 9,
  seriesId: "series-abc",
  type: "DEBIT",
  amount: 100,
  description: "Rent",
  mode: "INSTALLMENT",
  parcelsNumber: 12,
  firstParcel: 3,
  startDate: "2026-05-01",
  splitMode: "EQUAL",
  participants: [],
};

const recurringDefinition: RecurrenceDefinitionResponse = {
  id: 10,
  seriesId: "series-xyz",
  type: "CREDIT",
  amount: 200,
  description: "Salary",
  mode: "RECURRING",
  interval: "MONTHLY",
  startDate: "2026-01-01",
  endDate: "2026-12-01",
  splitMode: "EQUAL",
  participants: [],
};

describe("transactionFormSchema — recurring (create) validation", () => {
  it("rejects fewer than 2 installments", () => {
    const result = transactionFormSchema.safeParse({
      ...baseValues,
      recurrenceMode: "INSTALLMENT",
      parcelsNumber: "1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.find((i) => i.path[0] === "parcelsNumber")
          ?.message,
      ).toBe("Enter at least 2 installments");
    }
  });

  it("accepts a valid installment configuration", () => {
    const result = transactionFormSchema.safeParse({
      ...baseValues,
      recurrenceMode: "INSTALLMENT",
      parcelsNumber: "12",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a recurring transaction missing an end date", () => {
    const result = transactionFormSchema.safeParse({
      ...baseValues,
      recurrenceMode: "RECURRING",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.find((i) => i.path[0] === "endDate")?.message,
      ).toBe("Enter the end date");
    }
  });

  it("rejects an end date before the start date", () => {
    const result = transactionFormSchema.safeParse({
      ...baseValues,
      recurrenceMode: "RECURRING",
      endDate: new Date(2026, 5, 1),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.find((i) => i.path[0] === "endDate")?.message,
      ).toBe("The end date must be after the start date");
    }
  });

  it("rejects recurring=true without a chosen recurrence mode", () => {
    const result = transactionFormSchema.safeParse({
      ...baseValues,
      recurrenceMode: undefined,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.find((i) => i.path[0] === "recurrenceMode")
          ?.message,
      ).toBe("Select installment or recurring");
    }
  });
});

describe("transactionFormSchema — series edit validation", () => {
  it("rejects fewer than 2 installments regardless of the recurring flag", () => {
    const result = transactionFormSchema.safeParse({
      ...baseValues,
      recurring: false,
      seriesEdit: true,
      recurrenceMode: "INSTALLMENT",
      parcelsNumber: "1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.find((i) => i.path[0] === "parcelsNumber")
          ?.message,
      ).toBe("Enter at least 2 installments");
    }
  });

  it("rejects a missing end date for a recurring series edit", () => {
    const result = transactionFormSchema.safeParse({
      ...baseValues,
      recurring: false,
      seriesEdit: true,
      recurrenceMode: "RECURRING",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.find((i) => i.path[0] === "endDate")?.message,
      ).toBe("Enter the end date");
    }
  });

  it("accepts a valid series edit even though recurring is false", () => {
    const result = transactionFormSchema.safeParse({
      ...baseValues,
      recurring: false,
      seriesEdit: true,
      recurrenceMode: "INSTALLMENT",
      parcelsNumber: "12",
    });

    expect(result.success).toBe(true);
  });
});

describe("buildDefaultValues — series edit mode", () => {
  it("maps an installment series into edit defaults, stripping the parcel suffix", () => {
    const defaults = buildDefaultValues(
      installmentTransaction,
      1,
      installmentDefinition,
    );

    expect(defaults.seriesEdit).toBe(true);
    expect(defaults.description).toBe("Rent");
    expect(defaults.recurrenceMode).toBe("INSTALLMENT");
    expect(defaults.parcelsNumber).toBe("12");
    expect(defaults.endDate).toBeUndefined();
    expect(defaults.items).toEqual([]);
  });

  it("maps a recurring series into edit defaults with a parsed end date", () => {
    const recurringTransaction: FinancialTransaction = {
      ...installmentTransaction,
      seriesId: "series-xyz",
      description: "Salary",
    };

    const defaults = buildDefaultValues(
      recurringTransaction,
      1,
      recurringDefinition,
    );

    expect(defaults.seriesEdit).toBe(true);
    expect(defaults.recurrenceMode).toBe("RECURRING");
    expect(defaults.parcelsNumber).toBeUndefined();
    expect(defaults.endDate).toEqual(new Date(2026, 11, 1));
  });
});

describe("toSeriesCreatePayload", () => {
  it("maps an installment recurrence into the series create body", () => {
    const body = toSeriesCreatePayload(
      {
        ...baseValues,
        recurrenceMode: "INSTALLMENT",
        parcelsNumber: "12",
        currentParcel: "3",
      },
      false,
      undefined,
    );

    expect(body).toEqual({
      type: "DEBIT",
      description: "Rent",
      amount: 100,
      categoryId: undefined,
      mode: "INSTALLMENT",
      startDate: "2026-07-01",
      parcelsNumber: 12,
      currentParcel: 3,
      interval: undefined,
      endDate: undefined,
      splitMode: undefined,
      participants: undefined,
    });
  });

  it("omits currentParcel when it is 1 or unset", () => {
    const body = toSeriesCreatePayload(
      {
        ...baseValues,
        recurrenceMode: "INSTALLMENT",
        parcelsNumber: "12",
      },
      false,
      undefined,
    );

    expect(body.currentParcel).toBeUndefined();
  });

  it("maps a recurring recurrence into the series create body", () => {
    const body = toSeriesCreatePayload(
      {
        ...baseValues,
        recurrenceMode: "RECURRING",
        endDate: new Date(2026, 11, 1),
      },
      false,
      undefined,
    );

    expect(body).toEqual({
      type: "DEBIT",
      description: "Rent",
      amount: 100,
      categoryId: undefined,
      mode: "RECURRING",
      startDate: "2026-07-01",
      parcelsNumber: undefined,
      currentParcel: undefined,
      interval: "MONTHLY",
      endDate: "2026-12-01",
      splitMode: undefined,
      participants: undefined,
    });
  });
});

describe("toSeriesEditPayload", () => {
  it("maps series edit form values into the series edit request body", () => {
    const body = toSeriesEditPayload(
      {
        ...baseValues,
        seriesEdit: true,
        recurring: false,
        recurrenceMode: "INSTALLMENT",
        parcelsNumber: "10",
      },
      installmentTransaction,
      installmentDefinition,
      "ALL",
      false,
      undefined,
    );

    expect(body).toEqual({
      type: "DEBIT",
      amount: 100,
      description: "Rent",
      categoryId: undefined,
      mode: "INSTALLMENT",
      startDate: "2026-05-01",
      parcelsNumber: 10,
      interval: undefined,
      endDate: undefined,
      splitMode: undefined,
      participants: undefined,
      scope: "ALL",
      pivotOccurrenceId: 55,
    });
  });

  it("uses the definition's start date, not the form's date field", () => {
    const body = toSeriesEditPayload(
      {
        ...baseValues,
        seriesEdit: true,
        recurring: false,
        recurrenceMode: "INSTALLMENT",
        parcelsNumber: "10",
        date: new Date(2099, 0, 1),
      },
      installmentTransaction,
      installmentDefinition,
      "THIS_ONE",
      false,
      undefined,
    );

    expect(body.startDate).toBe("2026-05-01");
    expect(body.scope).toBe("THIS_ONE");
  });
});

describe("edit-mode reset — series edit", () => {
  it("stays in non-series shape while the recurrence definition is still loading", () => {
    const loadingDefaults = buildDefaultValues(installmentTransaction, 1, undefined);

    expect(loadingDefaults.seriesEdit).toBe(false);
    expect(loadingDefaults.recurrenceMode).toBeUndefined();
    expect(loadingDefaults.description).toBe("Rent (3/12)");
  });

  it("resets into series-edit shape once the recurrence definition arrives", () => {
    const loadingDefaults = buildDefaultValues(installmentTransaction, 1, undefined);
    const loadedDefaults = buildDefaultValues(
      installmentTransaction,
      1,
      installmentDefinition,
    );

    expect(loadedDefaults.seriesEdit).toBe(true);
    expect(loadedDefaults.recurrenceMode).toBe("INSTALLMENT");
    expect(loadedDefaults.parcelsNumber).toBe("12");
    expect(loadedDefaults.description).toBe("Rent");
    expect(loadedDefaults).not.toEqual(loadingDefaults);
  });
});
