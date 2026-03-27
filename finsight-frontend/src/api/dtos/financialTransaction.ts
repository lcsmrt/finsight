import { FinancialTransactionCategory } from ".";

export type FinancialTransactionType = "CREDIT" | "DEBIT";

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

export type FinancialTransactionSortBy = "startDate" | "endDate" | "amount" | "description";

export interface PagedFinancialTransactionsFilter {
  type?: FinancialTransactionType;
  categoryId?: number;
  description?: string;
  startDateFrom?: string;
  startDateTo?: string;
  amountMin?: number;
  amountMax?: number;
}

export type CreateFinancialTransactionRequest = {
  body: {
    type: FinancialTransactionType;
    amount: number;
    description: string;
    categoryId?: number;
    startDate: string;
    endDate?: string;
  };
};

export type UpdateFinancialTransactionRequest = {
  params: { id: number };
  body: Partial<CreateFinancialTransactionRequest["body"]>;
};
