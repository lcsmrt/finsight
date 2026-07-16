import { FinancialTransactionCategory } from ".";

export type FinancialTransactionType = "CREDIT" | "DEBIT";

export type SplitMode = "EQUAL" | "EXACT" | "PERCENT";

export type ParticipantShare = {
  id: number;
  name: string;
  shareAmount: number;
};

export type TransactionItem = {
  id: number;
  description: string;
  amount: number;
  quantity: number;
  category?: FinancialTransactionCategory;
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
  items: TransactionItem[];
};

export type ParticipantInput = {
  memberId: number;
  // Only used when splitMode is EXACT.
  shareAmount?: number;
};

export type ItemInput = {
  description: string;
  amount: number;
  categoryId?: number;
  quantity?: number;
};

export type FinancialTransactionSortBy =
  | "startDate"
  | "endDate"
  | "amount"
  | "description"
  | "category"
  | "attributedTo";

export interface PagedFinancialTransactionsFilter {
  type?: FinancialTransactionType;
  categoryId?: number;
  memberId?: number;
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
    items?: ItemInput[];
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
