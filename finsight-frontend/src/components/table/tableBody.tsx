import { flexRender, Table as TableType } from "@tanstack/react-table";
import { TableBodyBase, TableCellBase, TableRowBase } from "./tableParts";

type TableBodyProps<TData> = {
  table: TableType<TData>;
};

export const TableBody = <TableData,>({ table }: TableBodyProps<TableData>) => {
  return (
    <TableBodyBase>
      {table.getRowModel().rows.map((row) => (
        <TableRowBase key={row.id} className="w-full min-w-fit">
          {row.getVisibleCells().map((cell) => (
            <TableCellBase
              key={cell.id}
              style={{
                width: cell.column.getSize(),
              }}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCellBase>
          ))}
        </TableRowBase>
      ))}
    </TableBodyBase>
  );
};
