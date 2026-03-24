import { FinancialTransaction } from "@/api/dtos/financialTransaction";
import {
  useDeleteFinancialTransaction,
  useGetFinancialTransactions,
} from "@/api/services/useFinancialTransactionService";
import { Badge } from "@/components/badge/Badge";
import { Button } from "@/components/button/Button";
import { useConfirm } from "@/components/dialog/useConfirmDialog";
import { SectionHeader } from "@/components/sectionHeader/SectionHeader";
import { cn } from "@/lib/mergeClasses";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { ColumnDef } from "@tanstack/react-table";
import { PencilIcon, PlusIcon, TagIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { CategoriesManageDialog } from "./components/CategoriesManageDialog";
import { TransactionFormDrawer } from "./components/TransactionFormDrawer";
import { Table, TableContent } from "@/components/table";

const displayColumns: ColumnDef<FinancialTransaction>[] = [
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
    cell: ({ row }) => {
      const formattedAmount = formatCurrency(row.original.amount, "BRL");
      const type = row.original.type;
      return (
        <div
          className={cn(
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
    cell: ({ row }) => formatDate(row.original.startDate, "dd/MM/yyyy"),
  },
];

export const Home = () => {
  const { data: financialTransactionsData } = useGetFinancialTransactions();
  const { mutate: deleteTransaction } = useDeleteFinancialTransaction();

  const confirm = useConfirm();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<
    FinancialTransaction | undefined
  >();
  const [isCategoriesDialogOpen, setIsCategoriesDialogOpen] = useState(false);

  const handleOpenCreate = () => {
    setEditingTransaction(undefined);
    setIsDrawerOpen(true);
  };

  const handleEdit = (transaction: FinancialTransaction) => {
    setEditingTransaction(transaction);
    setIsDrawerOpen(true);
  };

  const handleDelete = async (transaction: FinancialTransaction) => {
    const confirmed = await confirm({
      title: "Confirm Deletion",
      description:
        "Are you sure you want to delete this transaction? This action cannot be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive",
    });

    if (confirmed) {
      deleteTransaction(transaction.id);
    }
  };

  const columns: ColumnDef<FinancialTransaction>[] = [
    ...displayColumns,
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="text-muted-foreground hover:bg-accent hover:text-foreground rounded p-1"
            onClick={() => handleEdit(row.original)}
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="text-muted-foreground hover:bg-accent hover:text-destructive rounded p-1"
            onClick={() => handleDelete(row.original)}
          >
            <Trash2Icon className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <section className="flex flex-col gap-6 pt-4">
      <SectionHeader
        title="Transactions"
        subtitle={`${financialTransactionsData?.length ?? 0} transactions`}
      >
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => setIsCategoriesDialogOpen(true)}
          >
            <TagIcon className="h-4 w-4" />
            Manage Categories
          </Button>
          <Button onClick={handleOpenCreate}>
            <PlusIcon className="h-4 w-4" />
            New Transaction
          </Button>
        </div>
      </SectionHeader>

      <Table
        tableId="financialTransactionsTable"
        data={financialTransactionsData || []}
        columns={columns}
      >
        <TableContent />
      </Table>

      <TransactionFormDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        transaction={editingTransaction}
      />

      <CategoriesManageDialog
        open={isCategoriesDialogOpen}
        onOpenChange={setIsCategoriesDialogOpen}
      />
    </section>
  );
};
