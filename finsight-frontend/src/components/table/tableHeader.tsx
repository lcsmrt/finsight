import { flexRender, Table as TableType } from "@tanstack/react-table";
import { ChevronDownIcon, ChevronsUpDown, ChevronUpIcon } from "lucide-react";
import { ReactNode } from "react";
import { TableHeadBase, TableHeaderBase, TableRowBase } from "./tableParts";
import { mergeClasses } from "@/lib/mergeClasses";

export type Sorting<T> = {
  by: keyof T;
  direction: "asc" | "desc";
};

type TableHeaderProps<TData> = {
  table: TableType<TData>;
  sorting?: Sorting<TData>[];
  onSortChange?: (sorting: Sorting<TData>[]) => void;
};

export const TableHeader = <TData,>({
  table,
  sorting,
  onSortChange,
}: TableHeaderProps<TData>) => {
  const toggleSort = (columnId: keyof TData) => {
    const currentSorting = sorting ?? [];
    const existing = currentSorting.find((s) => s.by === columnId);

    let newSorting: Sorting<TData>[];
    if (!existing) {
      newSorting = [...currentSorting, { by: columnId, direction: "asc" }];
    } else if (existing.direction === "asc") {
      newSorting = currentSorting.map((s) =>
        s.by === columnId ? { ...s, direction: "desc" } : s,
      );
    } else {
      newSorting = currentSorting.filter((s) => s.by !== columnId);
    }

    onSortChange?.(newSorting);
  };

  return (
    <TableHeaderBase className="bg-card sticky top-0 z-10 min-w-fit border-b">
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRowBase key={headerGroup.id} className="w-full min-w-fit">
          {headerGroup.headers.map((header) => {
            const isPlaceholder = header.isPlaceholder;
            const canSort = header.column.columnDef.enableSorting;
            const current = sorting?.find((s) => s.by === header.column.id);

            return (
              <TableHeadBase
                key={header.id}
                style={{ width: header.getSize() }}
              >
                {isPlaceholder ? null : canSort ? (
                  <SortableTableHeaderCell
                    direction={current?.direction}
                    onClick={() => toggleSort(header.column.id as keyof TData)}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </SortableTableHeaderCell>
                ) : (
                  <TableHeaderCell>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </TableHeaderCell>
                )}
                <div
                  onDoubleClick={() => header.column.resetSize()}
                  onMouseDown={header.getResizeHandler()}
                  onTouchStart={header.getResizeHandler()}
                  className={mergeClasses(
                    "bg-muted hover:bg-primary/50 absolute top-1/4 right-0 h-1/2 w-1 cursor-col-resize touch-none rounded transition-all select-none hover:w-1.5",
                    header.column.getIsResizing() && "bg-primary/50 w-1.5",
                  )}
                />
              </TableHeadBase>
            );
          })}
        </TableRowBase>
      ))}
    </TableHeaderBase>
  );
};

const TableHeaderCell = ({ children }: { children: ReactNode }) => {
  return <div className="truncate px-2 py-1 select-none">{children}</div>;
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
      className={mergeClasses(
        "group inline-flex w-full items-center justify-between gap-1 rounded px-2 py-1 select-none",
        "hover:bg-muted-foreground/10 truncate hover:cursor-pointer",
      )}
    >
      {children}

      <span>
        {direction === "asc" && <ChevronUpIcon className="mx-0.5 h-4 w-3" />}
        {direction === "desc" && <ChevronDownIcon className="mx-0.5 h-4 w-3" />}
        {!direction && <ChevronsUpDown className="h-4 w-4" />}
      </span>
    </div>
  );
};
