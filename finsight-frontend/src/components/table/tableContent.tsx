import { Sorting, TableHeader } from "./tableHeader";
import { useTable } from "./table";
import { TableBase } from "./tableParts";
import { TableBody } from "./tableBody";

type TableHeaderProps<TData> = {
  sorting?: Sorting<TData>[];
  onSortChange?: (sorting: Sorting<TData>[]) => void;
};

export const TableContent = <TData,>({
  sorting,
  onSortChange,
}: TableHeaderProps<TData>) => {
  const { table } = useTable();

  return (
    <TableBase className="w-full">
      <TableHeader
        table={table}
        sorting={sorting}
        onSortChange={onSortChange}
      />
      <TableBody table={table} />
    </TableBase>
  );
};
