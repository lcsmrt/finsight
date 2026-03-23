import { useState, useRef, useCallback, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { CheckIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetFinancialTransactionCategories,
  useCreateFinancialTransactionCategory,
  useUpdateFinancialTransactionCategory,
  useDeleteFinancialTransactionCategory,
} from "@/api/services/useFinancialTransactionService";
import { FinancialTransactionCategory } from "@/api/dtos/financialTransaction";
import { Table } from "@/components/table";
import { TableContent } from "@/components/table/TableContent";
import { formatCurrency } from "@/utils/formatters";
import { maskCurrency } from "@/utils/string/masks";
import { Button } from "@/components/button/Button";
import { Input } from "@/components/input/base/Input";
import { useConfirm } from "@/components/dialog/useConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog/Dialog";

interface CategoriesManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CategoriesManageDialog = ({
  open,
  onOpenChange,
}: CategoriesManageDialogProps) => {
  const { data: categories } = useGetFinancialTransactionCategories();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newDraft, setNewDraft] = useState({ description: "", spendingLimit: "" });

  // Uncontrolled refs for inline editing — no state updates on keystrokes
  const descInputRef = useRef<HTMLInputElement>(null);
  const limitInputRef = useRef<HTMLInputElement>(null);
  const editInitial = useRef({ description: "", spendingLimit: "" });

  const invalidateCategories = () => {
    queryClient.invalidateQueries({ queryKey: ["financialTransactionCategories"] });
  };

  const updateMutation = useUpdateFinancialTransactionCategory({
    onSuccess: () => {
      invalidateCategories();
      setEditingId(null);
    },
  });

  const createMutation = useCreateFinancialTransactionCategory({
    onSuccess: () => {
      invalidateCategories();
      setIsAddingNew(false);
      setNewDraft({ description: "", spendingLimit: "" });
    },
  });

  const deleteMutation = useDeleteFinancialTransactionCategory({
    onSuccess: invalidateCategories,
  });

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
    updateMutation.mutate({
      id: editingId,
      description: descInputRef.current?.value ?? "",
      spendingLimit: parseLimit(limitInputRef.current?.value ?? ""),
    });
  }, [editingId, updateMutation.mutate]);

  const handleDelete = useCallback(
    async (cat: FinancialTransactionCategory) => {
      const confirmed = await confirm({
        title: "Excluir categoria",
        description:
          "Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.",
        confirmLabel: "Excluir",
        cancelLabel: "Cancelar",
        variant: "destructive",
      });
      if (confirmed) {
        deleteMutation.mutate(cat.id);
      }
    },
    [confirm, deleteMutation.mutate],
  );

  const saveNew = () => {
    if (!newDraft.description.trim()) return;
    createMutation.mutate({
      description: newDraft.description.trim(),
      spendingLimit: parseLimit(newDraft.spendingLimit),
    });
  };

  const columns = useMemo<ColumnDef<FinancialTransactionCategory>[]>(
    () => [
      {
        id: "description",
        accessorKey: "description",
        header: "Nome",
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
        header: "Limite de gastos",
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
                  size="icon"
                  variant="ghost"
                  type="button"
                  className="text-muted-foreground hover:bg-accent hover:text-foreground rounded p-1"
                  onClick={cancelEdit}
                  disabled={updateMutation.isPending}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  type="button"
                  className="text-muted-foreground hover:bg-accent hover:text-foreground rounded p-1"
                  onClick={saveEdit}
                  disabled={updateMutation.isPending}
                >
                  <CheckIcon className="h-4 w-4" />
                </Button>
              </div>
            );
          }
          return (
            <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-focus-within/row:opacity-100 group-hover/row:opacity-100">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-muted-foreground hover:bg-accent hover:text-foreground rounded p-1"
                onClick={() => startEdit(row.original)}
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
          );
        },
      },
    ],
    [editingId, updateMutation.isPending, startEdit, cancelEdit, saveEdit, handleDelete],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Gerenciar categorias</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <div className="max-h-72 overflow-y-auto">
            <Table
              tableId="categoriesManageTable"
              data={categories || []}
              columns={columns}
            >
              <TableContent />
            </Table>
          </div>

          {isAddingNew ? (
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Input
                placeholder="Nome da categoria"
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
                size="sm"
                variant="ghost"
                type="button"
                onClick={() => setIsAddingNew(false)}
              >
                <XIcon className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                type="button"
                onClick={saveNew}
                disabled={createMutation.isPending || !newDraft.description.trim()}
              >
                <CheckIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
              type="button"
              onClick={() => setIsAddingNew(true)}
            >
              <PlusIcon className="h-4 w-4" />
              Nova categoria
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
