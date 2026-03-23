import { useState } from "react";
import { CheckIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  useComboboxAnchor,
} from "@/components/input/base/Combobox";
import { useConfirm } from "@/components/dialog/useConfirmDialog";
import {
  useGetFinancialTransactionCategories,
  useCreateFinancialTransactionCategory,
  useUpdateFinancialTransactionCategory,
  useDeleteFinancialTransactionCategory,
} from "@/api/services/useFinancialTransactionService";
import { FinancialTransactionCategory } from "@/api/dtos/financialTransaction";
import { cn } from "@/lib/mergeClasses";

interface CategoryComboboxProps {
  id?: string;
  value: FinancialTransactionCategory | null;
  onValueChange: (value: FinancialTransactionCategory | null) => void;
  disabled?: boolean;
}

export const CategoryCombobox = ({
  id,
  value,
  onValueChange,
  disabled,
}: CategoryComboboxProps) => {
  const anchor = useComboboxAnchor();
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const { data: categories = [] } = useGetFinancialTransactionCategories();

  const invalidateCategories = () =>
    queryClient.invalidateQueries({ queryKey: ["financialTransactionCategories"] });

  const updateMutation = useUpdateFinancialTransactionCategory({
    onSuccess: () => {
      invalidateCategories();
      setEditingId(null);
    },
  });

  const createMutation = useCreateFinancialTransactionCategory({
    onSuccess: (created) => {
      invalidateCategories();
      onValueChange(created);
      setSearch("");
    },
  });

  const deleteMutation = useDeleteFinancialTransactionCategory({
    onSuccess: () => {
      invalidateCategories();
    },
  });

  const displayedItems = search.trim()
    ? categories.filter((c) =>
        c.description.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : categories;

  const startEdit = (cat: FinancialTransactionCategory, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(cat.id);
    setEditDraft(cat.description);
  };

  const saveEdit = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!editingId || !editDraft.trim()) return;
    updateMutation.mutate({ id: editingId, description: editDraft.trim() });
  };

  const cancelEdit = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = async (
    cat: FinancialTransactionCategory,
    e: React.MouseEvent,
  ) => {
    e.preventDefault();
    e.stopPropagation();
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
      if (value?.id === cat.id) onValueChange(null);
    }
  };

  const showClear = value !== null;

  return (
    <Combobox
      id={id}
      items={displayedItems}
      value={value}
      onValueChange={(v) => {
        if (editingId) return;
        onValueChange(v);
        setSearch("");
      }}
      itemToStringLabel={(cat) => cat.description}
    >
      <div ref={anchor} className="relative">
        <ComboboxTrigger
          showChevron={false}
          render={
            <button
              type="button"
              disabled={disabled}
              className={cn(
                "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 disabled:bg-input/50 flex h-9 w-full cursor-pointer items-center justify-between rounded-md border bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
                showClear && "pr-8",
              )}
            />
          }
        >
          <span className={cn(!value && "text-muted-foreground")}>
            {value ? value.description : "Selecione uma categoria..."}
          </span>
        </ComboboxTrigger>
        {showClear && (
          <button
            type="button"
            tabIndex={-1}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onValueChange(null);
            }}
          >
            <XIcon className="h-3 w-3" />
          </button>
        )}
      </div>

      <ComboboxContent anchor={anchor}>
        <ComboboxInput
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          showTrigger={false}
          disabled={disabled}
        />
        {displayedItems.length === 0 && search.trim() ? (
          <div className="p-1">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                createMutation.mutate({ description: search.trim() });
                setSearch("");
              }}
              className="flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-primary hover:bg-accent"
            >
              <PlusIcon className="h-3.5 w-3.5 shrink-0" />
              Criar &ldquo;{search}&rdquo;
            </button>
          </div>
        ) : (
          <ComboboxEmpty>Nenhum resultado</ComboboxEmpty>
        )}
        <ComboboxList>
          {(cat: FinancialTransactionCategory) =>
            editingId === cat.id ? (
              <ComboboxItem
                key={String(cat.id)}
                value={cat}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className="flex w-full items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <input
                    autoFocus
                    className="min-w-0 flex-1 rounded border border-input bg-transparent px-2 py-0.5 text-sm outline-none"
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") saveEdit(e);
                      if (e.key === "Escape") cancelEdit(e);
                    }}
                  />
                  <button
                    type="button"
                    className="shrink-0 rounded p-0.5 text-success hover:bg-accent"
                    onMouseDown={saveEdit}
                  >
                    <CheckIcon className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent"
                    onMouseDown={cancelEdit}
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </div>
              </ComboboxItem>
            ) : (
              <ComboboxItem
                key={String(cat.id)}
                value={cat}
                className="group/cat"
              >
                <div className="flex min-w-0 flex-1 items-center justify-between gap-1">
                  <span className="flex-1 truncate">{cat.description}</span>
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/cat:opacity-100">
                    <button
                      type="button"
                      className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                      onMouseDown={(e) => startEdit(cat, e)}
                    >
                      <PencilIcon className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-destructive"
                      onMouseDown={(e) => void handleDelete(cat, e)}
                    >
                      <Trash2Icon className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </ComboboxItem>
            )
          }
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};
