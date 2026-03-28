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
import { Spinner } from "@/components/spinner/Spinner";
import { cn } from "@/lib/mergeClasses";
import { PlusIcon, XIcon } from "lucide-react";
import * as React from "react";

type WithId = { id: number | string };

function defaultEqual<T extends WithId>(a: T, b: T) {
  return a.id === b.id;
}

export interface StandardCombobox<T extends WithId> {
  id?: string;
  items: T[];
  value: T | null;
  onValueChange: (value: T | null) => void;
  itemLabel: (item: T) => string;
  placeholder?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  isItemEqualToValue?: (a: T, b: T) => boolean;
  emptyMessage?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  clearable?: boolean;
  onCreateOption?: (search: string) => void;
}

export function StandardCombobox<T extends WithId>({
  id,
  items,
  value,
  onValueChange,
  itemLabel,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  searchValue: externalSearch,
  onSearchChange,
  isItemEqualToValue = defaultEqual,
  emptyMessage = "No results",
  loading,
  disabled,
  className,
  clearable,
  onCreateOption,
}: StandardCombobox<T>) {
  const anchor = useComboboxAnchor();
  const [internalSearch, setInternalSearch] = React.useState("");

  const isSearchControlled = externalSearch !== undefined;
  const searchTerm = isSearchControlled ? externalSearch : internalSearch;

  const handleSearchChange = (val: string) => {
    if (!isSearchControlled) setInternalSearch(val);
    onSearchChange?.(val);
  };

  const handleValueChange = (val: T | null) => {
    if (val === null && value !== null && displayedItems.length === 0) return;
    onValueChange(val);
    if (!isSearchControlled) setInternalSearch("");
  };

  const displayedItems = React.useMemo(() => {
    if (isSearchControlled) return items;
    const q = searchTerm.trim().toLowerCase();
    return q
      ? items.filter((item) => itemLabel(item).toLowerCase().includes(q))
      : items;
  }, [items, searchTerm, isSearchControlled, itemLabel]);

  const showClear = clearable && value !== null;

  return (
    <Combobox
      id={id}
      items={displayedItems}
      value={value}
      onValueChange={handleValueChange}
      itemToStringLabel={itemLabel}
      isItemEqualToValue={isItemEqualToValue}
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
                className,
              )}
            />
          }
        >
          <span className={cn(!value && "text-muted-foreground")}>
            {value ? itemLabel(value) : placeholder}
          </span>
        </ComboboxTrigger>
        {showClear && (
          <button
            type="button"
            tabIndex={-1}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded"
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
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.currentTarget.value)}
          showTrigger={false}
          disabled={disabled}
        />
        {loading ? (
          <div className="text-muted-foreground flex items-center justify-center py-4">
            <Spinner />
          </div>
        ) : displayedItems.length === 0 && onCreateOption && searchTerm.trim() ? (
          <div className="p-1">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onCreateOption(searchTerm);
                if (!isSearchControlled) setInternalSearch("");
              }}
              className="text-primary hover:bg-accent flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-sm"
            >
              <PlusIcon className="h-3.5 w-3.5 shrink-0" />
              Criar &ldquo;{searchTerm}&rdquo;
            </button>
          </div>
        ) : (
          <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
        )}
        <ComboboxList>
          {(item: T) => (
            <ComboboxItem key={String(item.id)} value={item}>
              {itemLabel(item)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
