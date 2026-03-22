import type { Row } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { useTable } from "./Table";
import { TableBody } from "./components/TableBody";
import { type Sorting, TableHeader } from "./components/TableHeader";
import { TableBase } from "./components/TableParts";

type TableContentProps<TData> = {
  sorting?: Sorting<TData>[];
  onSortChange?: (sorting: Sorting<TData>[]) => void;
  stickyHeader?: boolean;
  renderSubComponent?: (row: Row<TData>) => ReactNode;
};

export const TableContent = <TData,>({
  sorting,
  onSortChange,
  stickyHeader,
  renderSubComponent,
}: TableContentProps<TData>) => {
  const { table } = useTable();

  return (
    <TableBase className="w-full">
      <TableHeader
        table={table}
        sorting={sorting}
        onSortChange={onSortChange}
        isSticky={stickyHeader}
      />
      <TableBody table={table} renderSubComponent={renderSubComponent} />
    </TableBase>
  );
};
