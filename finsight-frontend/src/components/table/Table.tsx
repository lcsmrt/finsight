import {
  type ColumnDef,
  type Row,
  type Table,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronRight } from "lucide-react";
import { type ReactNode, createContext, useContext, useMemo } from "react";
import { cn } from "@/lib/mergeClasses";

type TableProps<T> = {
  data: T[];
  columns: ColumnDef<T, any>[];
  tableId: string;
  children: ReactNode;
  getRowCanExpand?: (row: Row<T>) => boolean;
  border?: "none" | "x" | "y" | "all";
};

interface TableContextType {
  table: Table<any>;
}

const TableContext = createContext<TableContextType | null>(null);

export const TableRoot = <T,>({
  data,
  columns,
  tableId,
  children,
  getRowCanExpand,
  border = "y",
}: TableProps<T>) => {
  const expandable = !!getRowCanExpand;

  const allColumns = useMemo(() => {
    if (!expandable) return columns;

    const expanderColumn: ColumnDef<T, unknown> = {
      id: "__expander",
      header: () => null,
      cell: ({ row }) => {
        if (!row.getCanExpand()) return null;
        return (
          <ChevronRight
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              row.getIsExpanded() && "rotate-90",
            )}
          />
        );
      },
      enableSorting: false,
    };

    return [expanderColumn, ...columns];
  }, [columns, expandable]);

  const table = useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowCanExpand,
    manualSorting: true,
    debugTable: true,
    debugHeaders: true,
    debugColumns: true,
  });

  return (
    <TableContext.Provider value={{ table }}>
      <div
        id={tableId}
        className={cn(
          "overflow-x-auto w-full max-w-full mx-auto",
          border === "none" && "border-none",
          border === "x" && "border-x border-border",
          border === "y" && "border-y border-border",
          border === "all" && "border border-border",
        )}
      >
        {children}
      </div>
    </TableContext.Provider>
  );
};

export const useTable = () => {
  const context = useContext(TableContext);
  if (!context) throw new Error("useTable deve ser usado dentro de um Table");
  return context;
};
