import { FinancialTransactionCategory } from "@/api/dtos";
import {
  useDeleteFinancialTransactionCategory,
  useGetFinancialTransactionCategories,
} from "@/api/services/useFinancialTransactionCategoryService";
import { Button } from "@/components/button/Button";
import { useConfirm } from "@/components/dialog/useConfirmDialog";
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
import { InputGroupButton } from "@/components/input/base/InputGroup";
import { cn } from "@/lib/mergeClasses";
import { PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { useState } from "react";
import { useCategoryFormDialog } from "./CategoryFormDialog";

interface CategoryComboboxProps {
  id?: string;
  value: FinancialTransactionCategory | null | undefined;
  onValueChange: (
    value: FinancialTransactionCategory | null | undefined,
  ) => void;
  disabled?: boolean;
}

export const CategoryCombobox = ({
  id,
  value,
  onValueChange,
  disabled,
}: CategoryComboboxProps) => {
  const anchor = useComboboxAnchor();
  const confirm = useConfirm();
  const { openCreate, openEdit } = useCategoryFormDialog();

  const [search, setSearch] = useState("");

  const { data: categories } = useGetFinancialTransactionCategories();

  const deleteMutation = useDeleteFinancialTransactionCategory();

  const displayedItems = search.trim()
    ? categories?.content?.filter((c) =>
        c.description.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : categories?.content;

  const handleDelete = async (
    cat: FinancialTransactionCategory,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title: "Confirm Deletion",
      description:
        "Are you sure you want to delete this category? This action cannot be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive",
    });
    if (confirmed) {
      deleteMutation.mutate(cat.id);
      if (value?.id === cat.id) onValueChange(null);
    }
  };

  const handleOpenCreate = async () => {
    const created = await openCreate(search.trim());
    if (created) {
      onValueChange(created);
      setSearch("");
    }
  };

  const handleOpenEdit = async (cat: FinancialTransactionCategory) => {
    const updated = await openEdit(cat);
    if (updated && value?.id === updated.id) {
      onValueChange(updated);
    }
  };

  const showClear = value !== null;

  return (
    <Combobox
      id={id}
      items={displayedItems || []}
      value={value}
      onValueChange={(v) => {
        onValueChange(v);
        setSearch("");
      }}
      itemToStringLabel={(cat) => cat.description}
    >
      <div ref={anchor} className="relative">
        <ComboboxTrigger
          showChevron={false}
          render={
            <Button
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
            {value ? value.description : "Select a category..."}
          </span>
        </ComboboxTrigger>
        {showClear && (
          <InputGroupButton
            type="button"
            tabIndex={-1}
            className="text-muted-foreground absolute top-1/2 right-1 -translate-y-1/2"
            onClick={(e) => {
              e.stopPropagation();
              onValueChange(null);
            }}
          >
            <XIcon className="h-3 w-3" />
          </InputGroupButton>
        )}
      </div>

      <ComboboxContent anchor={anchor}>
        <ComboboxInput
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          showTrigger={false}
          disabled={disabled}
        />
        {displayedItems?.length === 0 && search.trim() ? (
          <div className="p-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleOpenCreate}
              className="text-primary hover:bg-accent flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm"
            >
              <PlusIcon className="h-3.5 w-3.5 shrink-0" />
              Create &ldquo;{search}&rdquo;
            </Button>
          </div>
        ) : (
          <ComboboxEmpty>No results</ComboboxEmpty>
        )}
        <ComboboxList>
          {(cat: FinancialTransactionCategory) => (
            <ComboboxItem
              key={String(cat.id)}
              value={cat}
              className="group/cat px-2"
            >
              <div className="flex min-w-0 flex-1 items-center justify-between gap-1">
                <span className="flex-1 truncate">{cat.description}</span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover/cat:opacity-100">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:bg-background rounded p-1 hover:cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleOpenEdit(cat);
                    }}
                  >
                    <PencilIcon className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:bg-background rounded p-1 hover:cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(cat, e);
                    }}
                  >
                    <Trash2Icon className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};
