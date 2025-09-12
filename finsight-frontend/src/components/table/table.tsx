import {
  ColumnDef,
  getCoreRowModel,
  Table as TableType,
  useReactTable,
} from "@tanstack/react-table";
import { createContext, ReactNode, useContext } from "react";

type TableProps<T> = {
  data: T[];
  columns: ColumnDef<T, any>[];
  tableId: string;
  children: ReactNode;
};

interface TableContextType {
  table: TableType<any>;
}

const TableContext = createContext<TableContextType | null>(null);

export const Table = <T,>({
  data,
  columns,
  tableId,
  children,
}: TableProps<T>) => {
  const table = useReactTable({
    data,
    columns,
    columnResizeMode: "onChange",
    columnResizeDirection: "ltr",
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    debugTable: true,
    debugHeaders: true,
    debugColumns: true,
  });

  return (
    <TableContext.Provider value={{ table }}>
      <div
        id={tableId}
        className="border-border mx-auto w-full max-w-full overflow-x-auto border-y"
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
