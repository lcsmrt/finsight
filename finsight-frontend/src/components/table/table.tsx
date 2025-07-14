import { createContext, ReactNode, useContext } from "react";
import { ColumnDef } from "@tanstack/react-table";

type TableContextValue<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
};

const TableContext = createContext<TableContextValue<any, any> | null>(null);

type TableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  children: ReactNode;
};

export const Table = <TData, TValue>({
  columns,
  data,
  children,
}: TableProps<TData, TValue>) => {
  return (
    <TableContext.Provider value={{ columns, data }}>
      {children}
    </TableContext.Provider>
  );
};

export const useTable = () => {
  const context = useContext(TableContext);
  if (!context)
    throw new Error("O hook useTable deve ser usado dentro de um Table");
  return context;
};
