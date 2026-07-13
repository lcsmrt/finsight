import { FinancialTransactionCategory } from ".";

export type FinancialTransactionType = "CREDIT" | "DEBIT";

export type SplitMode = "EQUAL" | "EXACT" | "PERCENT";

export type ParticipantShare = {
  id: number;
  name: string;
  shareAmount: number;
};

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
  createdBy?: {
    id: number;
    name: string;
  };
  splitMode: SplitMode;
  participants: ParticipantShare[];
};

export type ParticipantInput = {
  memberId: number;
  // Only used when splitMode is EXACT.
  shareAmount?: number;
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
    splitMode?: SplitMode;
    participants?: ParticipantInput[];
  };
};

export type UpdateFinancialTransactionRequest = {
  params: { id: number };
  body: CreateFinancialTransactionRequest["body"];
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
    // For installments, the month of the current parcel; for recurring, the first occurrence.
    startDate: string;
    parcelsNumber?: number;
    currentParcel?: number;
    interval?: RecurrenceInterval;
    endDate?: string;
    splitMode?: SplitMode;
    participants?: ParticipantInput[];
  };
};

export type FinancialTransactionSeriesResponse = {
  seriesId: string;
  count: number;
  occurrences: FinancialTransaction[];
};
