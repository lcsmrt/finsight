import { cn } from "@/lib/mergeClasses";
import { Skeleton } from "@/components/skeleton/Skeleton";
import { flexRender, type Row, type Table } from "@tanstack/react-table";
import { Fragment, type ReactNode } from "react";
import { TableBodyBase, TableCellBase, TableRowBase } from "./TableParts";

const SKELETON_ROWS = 5;

type TableBodyProps<TData> = {
  table: Table<TData>;
  renderSubComponent?: (row: Row<TData>) => ReactNode;
  emptyState?: ReactNode;
  isLoading?: boolean;
};

export const TableBody = <TData,>({ table, renderSubComponent, emptyState, isLoading }: TableBodyProps<TData>) => {
  const handleRowClick = (row: Row<TData>) => {
    if (!row.getCanExpand()) return;
    const isCurrentlyExpanded = row.getIsExpanded();
    table.setExpanded(isCurrentlyExpanded ? {} : { [row.id]: true });
  };

  const rows = table.getRowModel().rows;
  const colSpan = table.getAllColumns().length;

  if (isLoading) {
    return (
      <TableBodyBase>
        {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
          <TableRowBase key={i} className="min-w-fit items-center">
            {Array.from({ length: colSpan }).map((_, j) => (
              <TableCellBase key={j}>
                <Skeleton className="h-4 w-full" />
              </TableCellBase>
            ))}
          </TableRowBase>
        ))}
      </TableBodyBase>
    );
  }

  if (rows.length === 0) {
    return (
      <TableBodyBase>
        <tr>
          <td colSpan={colSpan} className="py-12 text-center text-sm text-muted-foreground">
            {emptyState ?? "No results."}
          </td>
        </tr>
      </TableBodyBase>
    );
  }

  return (
    <TableBodyBase>
      {rows.map((row) => {
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
