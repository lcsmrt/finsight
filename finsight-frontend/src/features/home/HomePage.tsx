import { FinancialTransaction } from "@/api/dtos/financialTransaction";
import {
  useDeleteFinancialTransaction,
  useGetFinancialTransactions,
} from "@/api/services/useFinancialTransactionService";
import { Badge } from "@/components/badge/Badge";
import { Button } from "@/components/button/Button";
import { useConfirm } from "@/components/dialog/useConfirmDialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/input/base/InputGroup";
import { SectionHeader } from "@/components/sectionHeader/SectionHeader";
import { Table, TableContent, TablePagination } from "@/components/table";
import { PlusIcon, SearchIcon, TagIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { CategoriesManageDialog } from "./components/CategoriesManageDialog";
import { TransactionFilterPopover } from "./components/TransactionFilterPopover";
import { TransactionFormDrawer } from "./components/TransactionFormDrawer";
import { buildTransactionColumns } from "./components/transactionColumns";
import { useTransactionFilters } from "./hooks/useTransactionFilters";

export const Home = () => {
  const {
    queryParams,
    chips,
    description,
    setDescription,
    appliedFilters,
    onApplyFilters,
    onClearFilters,
    onPageChange,
    onPageSizeChange,
    sorting,
    onSortChange,
  } = useTransactionFilters();

  const { data: financialTransactionsData, isLoading: isLoadingTransactions } =
    useGetFinancialTransactions(queryParams);
  const { mutate: deleteTransaction, isPending: isDeleting } =
    useDeleteFinancialTransaction();

  const confirm = useConfirm();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<
    FinancialTransaction | undefined
  >();
  const [isCategoriesDialogOpen, setIsCategoriesDialogOpen] = useState(false);

  const pagination = financialTransactionsData
    ? {
        number: financialTransactionsData.page,
        size: financialTransactionsData.size,
        totalElements: financialTransactionsData.totalElements,
        totalPages: financialTransactionsData.totalPages,
        first: financialTransactionsData.page === 0,
        last: financialTransactionsData.last,
      }
    : undefined;

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

  const columns = buildTransactionColumns({
    onEdit: handleEdit,
    onDelete: handleDelete,
    isDeleting,
  });

  return (
    <section className="flex flex-col gap-6 pt-4">
      <SectionHeader
        title="Transactions"
        subtitle={`${financialTransactionsData?.totalElements ?? 0} transactions`}
      >
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsCategoriesDialogOpen(true)}
          >
            <TagIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Manage Categories</span>
          </Button>
          <Button onClick={handleOpenCreate}>
            <PlusIcon className="h-4 w-4" />
            <span className="hidden sm:inline">New Transaction</span>
          </Button>
        </div>
      </SectionHeader>

      <div className="flex flex-col gap-2 px-2">
        <div className="flex gap-2">
          <InputGroup className="flex-1">
            <InputGroupInput
              placeholder="Search transactions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full pl-9"
            />
            <InputGroupAddon>
              <SearchIcon className="text-muted-foreground pointer-events-none h-4 w-4" />
            </InputGroupAddon>
          </InputGroup>

          <TransactionFilterPopover
            appliedFilters={appliedFilters}
            onApply={onApplyFilters}
          />
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <Badge key={chip.key} variant="outline" className="gap-1 pr-1">
                {chip.label}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 rounded"
                  onClick={chip.onRemove}
                >
                  <XIcon className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
            <Button
              type="button"
              variant="link"
              size="sm"
              className="text-muted-foreground h-auto p-0 text-xs"
              onClick={onClearFilters}
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      <Table
        tableId="financialTransactionsTable"
        data={financialTransactionsData?.content || []}
        columns={columns}
      >
        <TableContent
          sorting={sorting}
          onSortChange={onSortChange}
          emptyState="No transactions found."
          isLoading={isLoadingTransactions}
        />
        <TablePagination
          pagination={pagination}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
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
