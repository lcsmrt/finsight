export type FinancialTransactionCategory = {
  id: number;
  description: string;
  spendingLimit?: number | null;
};

export type FinancialTransactionCategorySortBy =
  | "description"
  | "spendingLimit";

export interface PagedFinancialTransactionCategoriesFilter {
  description?: string;
}

export type CreateFinancialTransactionCategoryRequest = {
  body: {
    description: string;
    spendingLimit?: number;
  };
};

export type UpdateFinancialTransactionCategoryRequest = {
  params: { id: number };
  body: Partial<CreateFinancialTransactionCategoryRequest["body"]>;
};
