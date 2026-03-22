import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  useComboboxAnchor,
} from "@/components/input/base/Combobox";
import { cn } from "@/lib/mergeClasses";
import * as React from "react";

type WithId = { id: number | string };

function defaultEqual<T extends WithId>(a: T, b: T) {
  return a.id === b.id;
}

export interface StandardMultiCombobox<T extends WithId> {
  id?: string;
  items: T[];
  value: T[];
  onValueChange: (value: T[]) => void;
  itemLabel: (item: T) => string;
  placeholder?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  isItemEqualToValue?: (a: T, b: T) => boolean;
  emptyMessage?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  /** Número máximo de chips exibidos. Os demais são indicados com um badge "+N". Padrão: 3. */
  maxVisibleChips?: number;
}

export function StandardMultiCombobox<T extends WithId>({
  id,
  items,
  value,
  onValueChange,
  itemLabel,
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar...",
  searchValue: externalSearch,
  onSearchChange,
  isItemEqualToValue = defaultEqual,
  emptyMessage = "Nenhum resultado",
  disabled,
  className,
  maxVisibleChips = 3,
}: StandardMultiCombobox<T>) {
  const anchor = useComboboxAnchor();
  const [internalSearch, setInternalSearch] = React.useState("");

  const isSearchControlled = externalSearch !== undefined;
  const searchTerm = isSearchControlled ? externalSearch : internalSearch;

  const handleSearchChange = (val: string) => {
    if (!isSearchControlled) setInternalSearch(val);
    onSearchChange?.(val);
  };

  const handleValueChange = (val: T[]) => {
    if (val.length === 0 && value.length > 0 && displayedItems.length === 0) return;
    onValueChange(val);
    if (!isSearchControlled) setInternalSearch("");
  };

  const displayedItems = React.useMemo(() => {
    if (isSearchControlled) return items;
    const q = searchTerm.trim().toLowerCase();
    return q ? items.filter((item) => itemLabel(item).toLowerCase().includes(q)) : items;
  }, [items, searchTerm, isSearchControlled, itemLabel]);

  const visibleChips = value.slice(0, maxVisibleChips);
  const overflowCount = value.length - visibleChips.length;

  return (
    <Combobox
      id={id}
      items={displayedItems}
      value={value}
      onValueChange={handleValueChange}
      itemToStringLabel={itemLabel}
      isItemEqualToValue={isItemEqualToValue}
      multiple
    >
      <div ref={anchor} className="min-w-0 w-full">
        <ComboboxTrigger
          disabled={disabled}
          showChevron={false}
          render={
            <ComboboxChips
              className={cn(
                "focus-within:border-input focus-within:ring-0 flex-nowrap overflow-hidden w-full",
                className,
              )}
              aria-disabled={disabled || undefined}
            />
          }
        >
          {visibleChips.map((item) => (
            <ComboboxChip key={String(item.id)}>
              <span className="max-w-28 truncate">{itemLabel(item)}</span>
            </ComboboxChip>
          ))}
          {value.length === 0 && (
            <span className="text-muted-foreground flex-1 text-sm">{placeholder}</span>
          )}
          {overflowCount > 0 && (
            <span className="bg-muted text-muted-foreground flex h-[calc(--spacing(5.25))] shrink-0 items-center rounded-sm px-1.5 text-xs font-medium whitespace-nowrap">
              +{overflowCount}
            </span>
          )}
        </ComboboxTrigger>
      </div>

      <ComboboxContent anchor={anchor}>
        <ComboboxInput
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.currentTarget.value)}
          showTrigger={false}
          disabled={disabled}
        />
        <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
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
