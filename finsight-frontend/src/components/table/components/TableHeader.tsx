import { cn } from "@/lib/mergeClasses";
import { flexRender, type Table } from "@tanstack/react-table";
import { ChevronDownIcon, ChevronsUpDown, ChevronUpIcon } from "lucide-react";
import type { ReactNode } from "react";
import { TableHeadBase, TableHeaderBase, TableRowBase } from "./TableParts";

export type Sorting<T> = {
  by: keyof T;
  direction: "asc" | "desc";
};

type TableHeaderProps<TData> = {
  table: Table<TData>;
  sorting?: Sorting<TData>[];
  onSortChange?: (sorting: Sorting<TData>[]) => void;
  isSticky?: boolean;
};

export const TableHeader = <TData,>({
  table,
  sorting,
  onSortChange,
  isSticky = true,
}: TableHeaderProps<TData>) => {
  const toggleSort = (columnId: keyof TData) => {
    const currentSorting = sorting ?? [];
    const existing = currentSorting.find((s) => s.by === columnId);

    let newSorting: Sorting<TData>[];
    if (!existing) {
      newSorting = [...currentSorting, { by: columnId, direction: "asc" }];
    } else if (existing.direction === "asc") {
      newSorting = currentSorting.map((s) => (s.by === columnId ? { ...s, direction: "desc" } : s));
    } else {
      newSorting = currentSorting.filter((s) => s.by !== columnId);
    }

    onSortChange?.(newSorting);
  };

  return (
    <TableHeaderBase className={cn("z-10 bg-card border-b min-w-fit", isSticky && "sticky top-0")}>
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRowBase key={headerGroup.id}>
          {headerGroup.headers.map((header) => {
            const isPlaceholder = header.isPlaceholder;
            const canSort = header.column.columnDef.enableSorting;
            const current = sorting?.find((s) => s.by === header.column.id);

            return (
              <TableHeadBase key={header.id}>
                {isPlaceholder ? null : canSort ? (
                  <SortableTableHeaderCell
                    direction={current?.direction}
                    onClick={() => toggleSort(header.column.id as keyof TData)}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </SortableTableHeaderCell>
                ) : (
                  <TableHeaderCell>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHeaderCell>
                )}
              </TableHeadBase>
            );
          })}
        </TableRowBase>
      ))}
    </TableHeaderBase>
  );
};

const TableHeaderCell = ({ children }: { children: ReactNode }) => {
  return <div className="px-2 py-1 select-none truncate">{children}</div>;
};

type SortableTableHeaderCellProps = {
  children: ReactNode;
  direction?: "asc" | "desc";
  onClick?: (event?: unknown) => void;
};

const SortableTableHeaderCell = ({
  children,
  direction,
  onClick,
}: SortableTableHeaderCellProps) => {
  return (
    <div
      role="button"
      onClick={onClick}
      className={cn(
        "group inline-flex w-full items-center gap-1 rounded px-2 py-1 select-none justify-between",
        "hover:bg-muted-foreground/10 hover:cursor-pointer truncate",
      )}
    >
      {children}

      <span>
        {direction === "asc" && <ChevronUpIcon className="mx-0.5 h-4 w-3" />}
        {direction === "desc" && <ChevronDownIcon className="mx-0.5 h-4 w-3" />}
        {!direction && <ChevronsUpDown className="mx-0.5 h-4 w-3" />}
      </span>
    </div>
  );
};
