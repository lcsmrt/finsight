import { cn } from "@/lib/mergeClasses";
import { flexRender, type Row, type Table } from "@tanstack/react-table";
import { Fragment, type ReactNode } from "react";
import { TableBodyBase, TableCellBase, TableRowBase } from "./TableParts";

type TableBodyProps<TData> = {
  table: Table<TData>;
  renderSubComponent?: (row: Row<TData>) => ReactNode;
};

export const TableBody = <TData,>({ table, renderSubComponent }: TableBodyProps<TData>) => {
  const handleRowClick = (row: Row<TData>) => {
    if (!row.getCanExpand()) return;
    const isCurrentlyExpanded = row.getIsExpanded();
    table.setExpanded(isCurrentlyExpanded ? {} : { [row.id]: true });
  };

  return (
    <TableBodyBase>
      {table.getRowModel().rows.map((row) => {
        const isExpandable = row.getCanExpand();
        const isExpanded = row.getIsExpanded();

        return (
          <Fragment key={row.id}>
            <TableRowBase
              className={cn(
                "min-w-fit items-center",
                isExpandable && "cursor-pointer hover:bg-muted/60",
              )}
              onClick={isExpandable ? () => handleRowClick(row) : undefined}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCellBase key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCellBase>
              ))}
            </TableRowBase>
            {isExpanded && renderSubComponent && (
              <tr>
                <td colSpan={row.getVisibleCells().length} className="bg-muted/20 p-0">
                  <div className="border-l-2 border-primary ml-6 py-3 pr-4">
                    {renderSubComponent(row)}
                  </div>
                </td>
              </tr>
            )}
          </Fragment>
        );
      })}
    </TableBodyBase>
  );
};
