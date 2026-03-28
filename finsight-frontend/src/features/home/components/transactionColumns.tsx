import { FinancialTransaction } from "@/api/dtos/financialTransaction";
import { Badge } from "@/components/badge/Badge";
import { Button } from "@/components/button/Button";
import { cn } from "@/lib/mergeClasses";
import { formatCurrency, formatDate } from "@/utils/string/formatters";
import { ColumnDef } from "@tanstack/react-table";
import { PencilIcon, Trash2Icon } from "lucide-react";

type TransactionColumnHandlers = {
  onEdit: (transaction: FinancialTransaction) => void;
  onDelete: (transaction: FinancialTransaction) => void;
  isDeleting?: boolean;
};

export const buildTransactionColumns = ({
  onEdit,
  onDelete,
  isDeleting,
}: TransactionColumnHandlers): ColumnDef<FinancialTransaction>[] => [
  {
    id: "description",
    accessorKey: "description",
    header: "Description",
    enableSorting: true,
    cell: ({ row }) => row.original.description,
  },
  {
    id: "category",
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      const category = row.original.category;
      if (category) {
        return <Badge variant="outline">{category.description}</Badge>;
      }
      return null;
    },
  },
  {
    id: "amount",
    accessorKey: "amount",
    header: "Amount",
    enableSorting: true,
    cell: ({ row }) => {
      const formattedAmount = formatCurrency(row.original.amount, "BRL");
      const type = row.original.type;
      return (
        <div
          className={cn(
            "font-mono",
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
    enableSorting: true,
    cell: ({ row }) => formatDate(row.original.startDate, "dd/MM/yyyy"),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1 transition-opacity opacity-100 sm:opacity-0 sm:group-hover/row:opacity-100 sm:group-focus-within/row:opacity-100">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:bg-accent hover:text-foreground rounded p-1"
          onClick={() => onEdit(row.original)}
        >
          <PencilIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:bg-accent hover:text-destructive rounded p-1"
          disabled={isDeleting}
          onClick={() => onDelete(row.original)}
        >
          <Trash2Icon className="h-4 w-4" />
        </Button>
      </div>
    ),
  },
];
