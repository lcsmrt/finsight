import type { FinancialTransactionType } from "./financialTransaction";

export type FinancialTransactionCategory = {
  id: number;
  type: FinancialTransactionType;
  description: string;
  spendingLimit?: number | null;
};

export type FinancialTransactionCategorySortBy =
  | "description"
  | "spendingLimit";

export interface PagedFinancialTransactionCategoriesFilter {
  description?: string;
  type?: FinancialTransactionType;
}

export type CreateFinancialTransactionCategoryRequest = {
  body: {
    type: FinancialTransactionType;
    description: string;
    spendingLimit?: number;
  };
};

export type UpdateFinancialTransactionCategoryRequest = {
  params: { id: number };
  body: Partial<CreateFinancialTransactionCategoryRequest["body"]>;
};
