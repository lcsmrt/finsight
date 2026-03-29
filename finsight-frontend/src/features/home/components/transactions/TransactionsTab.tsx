import { FinancialTransaction } from "@/api/dtos/financialTransaction";
import {
  useDeleteFinancialTransaction,
  useGetFinancialTransactions,
  useImportNubankCsv,
  useUpdateFinancialTransaction,
} from "@/api/services/useFinancialTransactionService";
import { Badge } from "@/components/badge/Badge";
import { Button } from "@/components/button/Button";
import { useConfirm } from "@/components/dialog/useConfirmDialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/input/base/InputGroup";
import { Table, TableContent, TablePagination } from "@/components/table";
import { PlusIcon, SearchIcon, TagIcon, UploadIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { useTransactionFilters } from "../../hooks/useTransactionFilters";
import { CategoriesManageDialog } from "./CategoriesManageDialog";
import { TransactionFilterPopover } from "./TransactionFilterPopover";
import { TransactionFormDrawer } from "./TransactionFormDrawer";
import { buildTransactionColumns, InlineSaveBody } from "./transactionColumns";

export const TransactionsTab = () => {
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
  const { mutate: updateTransaction } = useUpdateFinancialTransaction();

  const confirm = useConfirm();

  const { mutate: importCsv, isPending: isImporting } = useImportNubankCsv();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit" | "duplicate">("create");
  const [editingTransaction, setEditingTransaction] = useState<
    FinancialTransaction | undefined
  >();
  const [isCategoriesDialogOpen, setIsCategoriesDialogOpen] = useState(false);

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importCsv(file);
      e.target.value = "";
    }
  };

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
    setMode("create");
    setIsDrawerOpen(true);
  };

  const handleEdit = (transaction: FinancialTransaction) => {
    setEditingTransaction(transaction);
    setMode("edit");
    setIsDrawerOpen(true);
  };

  const handleDuplicate = (transaction: FinancialTransaction) => {
    setEditingTransaction(transaction);
    setMode("duplicate");
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

  const handleInlineSave = (id: number, body: InlineSaveBody) => {
    updateTransaction({ params: { id }, body });
  };

  const columns = buildTransactionColumns({
    onDuplicate: handleDuplicate,
    onEdit: handleEdit,
    onDelete: handleDelete,
    onSave: handleInlineSave,
    isDeleting,
  });

  return (
    <>
      <div className="flex flex-col gap-2 px-2">
        <div className="flex gap-2">
          <div className="jusbtify-between flex flex-1 gap-2">
            <InputGroup className="flex-1 sm:max-w-sm">
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

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCategoriesDialogOpen(true)}
            >
              <TagIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Manage Categories</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleImportClick}
              disabled={isImporting}
            >
              <UploadIcon className="h-4 w-4" />
              <span className="hidden sm:inline">
                {isImporting ? "Importing..." : "Import CSV"}
              </span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button onClick={handleOpenCreate}>
              <PlusIcon className="h-4 w-4" />
              <span className="hidden sm:inline">New Transaction</span>
            </Button>
          </div>
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
        mode={mode}
      />

      <CategoriesManageDialog
        open={isCategoriesDialogOpen}
        onOpenChange={setIsCategoriesDialogOpen}
      />
    </>
  );
};
