import { FinancialTransactionCategory } from "@/api/dtos";
import {
  useCreateFinancialTransactionCategory,
  useDeleteFinancialTransactionCategory,
  useGetFinancialTransactionCategories,
  useUpdateFinancialTransactionCategory,
} from "@/api/services/useFinancialTransactionCategoryService";
import { Button } from "@/components/button/Button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog/Dialog";
import { useConfirm } from "@/components/dialog/useConfirmDialog";
import { Input } from "@/components/input/base/Input";
import { Table } from "@/components/table";
import { TableContent } from "@/components/table/TableContent";
import { formatCurrency } from "@/utils/string/formatters";
import { maskCurrency } from "@/utils/string/masks";
import { ColumnDef } from "@tanstack/react-table";
import {
  CheckIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

interface CategoriesManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CategoriesManageDialog = ({
  open,
  onOpenChange,
}: CategoriesManageDialogProps) => {
  const { data: categories, isLoading: isLoadingCategories } =
    useGetFinancialTransactionCategories();
  const confirm = useConfirm();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newDraft, setNewDraft] = useState({
    description: "",
    spendingLimit: "",
  });

  const descInputRef = useRef<HTMLInputElement>(null);
  const limitInputRef = useRef<HTMLInputElement>(null);
  const editInitial = useRef({ description: "", spendingLimit: "" });

  const {
    mutate: updateFinancialTransactionCategory,
    isPending: isUpdatingFinancialTransactionCategory,
  } = useUpdateFinancialTransactionCategory({
    onSuccess: () => setEditingId(null),
  });

  const {
    mutate: createFinancialTransactionCategory,
    isPending: isCreatingFinancialTransactionCategory,
  } = useCreateFinancialTransactionCategory({
    onSuccess: () => {
      setIsAddingNew(false);
      setNewDraft({ description: "", spendingLimit: "" });
    },
  });

  const { mutate: deleteFinancialTransactionCategory } =
    useDeleteFinancialTransactionCategory();

  const parseLimit = (masked: string) => {
    const digits = masked.replace(/\D/g, "");
    return digits ? parseInt(digits, 10) / 100 : undefined;
  };

  const startEdit = useCallback((cat: FinancialTransactionCategory) => {
    editInitial.current = {
      description: cat.description,
      spendingLimit:
        cat.spendingLimit != null
          ? maskCurrency(String(Math.round(cat.spendingLimit * 100)))
          : "",
    };
    setEditingId(cat.id);
  }, []);

  const cancelEdit = useCallback(() => setEditingId(null), []);

  const saveEdit = useCallback(() => {
    if (!editingId) return;
    updateFinancialTransactionCategory({
      params: { id: editingId },
      body: {
        description: descInputRef.current?.value ?? "",
        spendingLimit: parseLimit(limitInputRef.current?.value ?? ""),
      },
    });
  }, [editingId, updateFinancialTransactionCategory]);

  const handleDelete = useCallback(
    async (cat: FinancialTransactionCategory) => {
      const confirmed = await confirm({
        title: "Confirm Deletion",
        description:
          "Are you sure you want to delete this category? This action cannot be undone.",
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
        variant: "destructive",
      });
      if (confirmed) {
        deleteFinancialTransactionCategory(cat.id);
      }
    },
    [confirm, deleteFinancialTransactionCategory],
  );

  const saveNew = () => {
    if (!newDraft.description.trim()) return;
    createFinancialTransactionCategory({
      body: {
        description: newDraft.description.trim(),
        spendingLimit: parseLimit(newDraft.spendingLimit),
      },
    });
  };

  const columns = useMemo<ColumnDef<FinancialTransactionCategory>[]>(
    () => [
      {
        id: "description",
        accessorKey: "description",
        header: "Name",
        cell: ({ row }) => {
          if (editingId === row.original.id) {
            return (
              <Input
                ref={descInputRef}
                defaultValue={editInitial.current.description}
                className="h-7"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit();
                  if (e.key === "Escape") cancelEdit();
                }}
              />
            );
          }
          return row.original.description;
        },
      },
      {
        id: "spendingLimit",
        accessorKey: "spendingLimit",
        header: "Spending Limit",
        cell: ({ row }) => {
          if (editingId === row.original.id) {
            return (
              <Input
                ref={limitInputRef}
                defaultValue={editInitial.current.spendingLimit}
                type="text"
                inputMode="numeric"
                className="h-7"
                placeholder="R$ 0,00"
                onChange={(e) => {
                  e.target.value = maskCurrency(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveEdit();
                  if (e.key === "Escape") cancelEdit();
                }}
              />
            );
          }
          const limit = row.original.spendingLimit;
          return limit ? (
            formatCurrency(limit, "BRL")
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          if (editingId === row.original.id) {
            return (
              <div className="flex items-center justify-end gap-1">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  type="button"
                  className="text-muted-foreground hover:text-destructive rounded"
                  onClick={cancelEdit}
                  disabled={isUpdatingFinancialTransactionCategory}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  type="button"
                  className="text-muted-foreground hover:text-success rounded"
                  onClick={saveEdit}
                  disabled={isUpdatingFinancialTransactionCategory}
                >
                  <CheckIcon className="h-4 w-4" />
                </Button>
              </div>
            );
          } else {
            return (
              <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within/row:opacity-100 sm:group-hover/row:opacity-100">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="text-muted-foreground hover:bg-accent hover:text-foreground rounded"
                  onClick={() => startEdit(row.original)}
                >
                  <PencilIcon className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="text-muted-foreground hover:bg-accent hover:text-destructive rounded"
                  onClick={() => handleDelete(row.original)}
                >
                  <Trash2Icon className="h-4 w-4" />
                </Button>
              </div>
            );
          }
        },
      },
    ],
    [
      editingId,
      isUpdatingFinancialTransactionCategory,
      startEdit,
      cancelEdit,
      saveEdit,
      handleDelete,
    ],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen, event) => {
        if (!newOpen && editingId !== null) {
          event.cancel();
          cancelEdit();
          return;
        }
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="-mx-4 max-h-72 overflow-y-auto [&_table]:table-fixed">
            <Table
              tableId="categoriesManageTable"
              data={categories?.content || []}
              columns={columns}
            >
              <TableContent isLoading={isLoadingCategories} />
            </Table>
          </div>

          {isAddingNew ? (
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Input
                placeholder="Category name"
                value={newDraft.description}
                onChange={(e) =>
                  setNewDraft((d) => ({ ...d, description: e.target.value }))
                }
                className="h-7 flex-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveNew();
                  if (e.key === "Escape") setIsAddingNew(false);
                }}
              />
              <Input
                type="text"
                inputMode="numeric"
                placeholder="R$ 0,00"
                value={newDraft.spendingLimit}
                onChange={(e) => {
                  e.target.value = maskCurrency(e.target.value);
                  setNewDraft((d) => ({ ...d, spendingLimit: e.target.value }));
                }}
                className="h-7 w-32"
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveNew();
                  if (e.key === "Escape") setIsAddingNew(false);
                }}
              />
              <Button
                size="icon-sm"
                variant="ghost"
                type="button"
                className="text-muted-foreground hover:text-destructive rounded p-1"
                onClick={() => setIsAddingNew(false)}
              >
                <XIcon className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                type="button"
                className="text-muted-foreground hover:text-success rounded p-1"
                onClick={saveNew}
                disabled={
                  isCreatingFinancialTransactionCategory ||
                  !newDraft.description.trim()
                }
              >
                <CheckIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-success -mb-0.5 w-full justify-start"
              type="button"
              onClick={() => setIsAddingNew(true)}
            >
              <PlusIcon className="h-4 w-4" />
              New Category
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
          >
            <XIcon className="h-4 w-4" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
