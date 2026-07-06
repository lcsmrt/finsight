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
  seriesId?: string;
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

export type RecurrenceMode = "INSTALLMENT" | "RECURRING";

export type RecurrenceInterval = "MONTHLY";

export type CreateFinancialTransactionSeriesRequest = {
  body: {
    type: FinancialTransactionType;
    amount: number;
    description: string;
    categoryId?: number;
    mode: RecurrenceMode;
    startDate: string;
    parcelsNumber?: number;
    interval?: RecurrenceInterval;
    endDate?: string;
  };
};

export type FinancialTransactionSeriesResponse = {
  seriesId: string;
  count: number;
  occurrences: FinancialTransaction[];
};
