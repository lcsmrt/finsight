export type FinancialTransaction = {
  id: number;
  category?: FinancialTransactionCategory;
  type: FinancialTransactionType;
  amount: number;
  description: string;
  frequency?: string;
  parcelsNumber?: number;
  startDate: string;
  endDate: string;
};

export type FinancialTransactionCategory = {
  id: number;
  description: string;
  spendingLimit?: number;
};

export type FinancialTransactionType = "CREDIT" | "DEBIT";

export type CreateFinancialTransactionBody = {
  type: FinancialTransactionType;
  amount: number;
  description: string;
  categoryId?: number;
  startDate: string;
  endDate?: string;
};

export type UpdateFinancialTransactionBody = Partial<CreateFinancialTransactionBody>;

export type UpdateFinancialTransactionParams = { id: number } & UpdateFinancialTransactionBody;

export type CreateFinancialTransactionCategoryBody = {
  description: string;
  spendingLimit?: number;
};

export type UpdateFinancialTransactionCategoryParams = { id: number } & Partial<CreateFinancialTransactionCategoryBody>;
