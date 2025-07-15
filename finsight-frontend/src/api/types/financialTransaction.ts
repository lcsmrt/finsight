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

export type FinancialTransactionType = "ENTRADA" | "SAIDA";
