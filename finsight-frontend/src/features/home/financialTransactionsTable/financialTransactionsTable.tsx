import { useGetFinancialTransactions } from "@/api/services/financialTransactionService";
import { FinancialTransaction } from "@/api/types/financialTransaction";
import { Table } from "@/components/table";
import { TableContent } from "@/components/table/tableContent";
import { mergeClasses } from "@/lib/mergeClasses";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { ColumnDef } from "@tanstack/react-table";

const financialTransactionsColumns: ColumnDef<FinancialTransaction>[] = [
  {
    id: "description",
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => row.original.description,
  },
  {
    id: "category",
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      <></>;
    },
  },
  {
    id: "amount",
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => {
      const formattedAmount = formatCurrency(row.original.amount, "BRL");
      const type = row.original.type;

      return (
        <div
          className={mergeClasses(
            type === "DEBIT" && "text-destructive",
            type === "CREDIT" && "text-success",
          )}
        >{`${type === "DEBIT" ? "- " : ""}${formattedAmount}`}</div>
      );
    },
  },
  {
    id: "startDate",
    accessorKey: "startDate",
    header: "Date",
    cell: ({ row }) => {
      const formattedDate = formatDate(row.original.startDate, "dd/MM/yyyy");

      return formattedDate;
    },
  },
];

export const FinancialTransactionsTable = () => {
  const { data: financialTransactionsData } = useGetFinancialTransactions();

  return (
    <Table
      tableId="financialTransactionsTable"
      data={financialTransactionsData || []}
      columns={financialTransactionsColumns}
    >
      <TableContent />
    </Table>
  );
};
