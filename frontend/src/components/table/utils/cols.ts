import type { ColumnDef, Table } from "@tanstack/react-table";

export function getInitialColumnSizing<T>(
  columns: ColumnDef<T, any>[],
  containerWidth: number
): Record<string, number> {
  const fixedSizes: Record<string, number> = {};
  let totalFixed = 0;
  let autoColumns: string[] = [];

  columns.forEach((col) => {
    if (typeof col.size === "number") {
      fixedSizes[col.id as string] = col.size;
      totalFixed += col.size;
    } else {
      autoColumns.push(col.id as string);
    }
  });

  const remaining = Math.max(containerWidth - totalFixed, 0);
  const autoSize = autoColumns.length > 0 ? remaining / autoColumns.length : 0;

  const result: Record<string, number> = { ...fixedSizes };
  autoColumns.forEach((id) => {
    result[id] = autoSize;
  });

  return result;
}

export function stretchColumns<T>(table: Table<T>, containerWidth: number) {
  const columns = table.getAllLeafColumns();
  const total = columns.reduce((sum, col) => sum + col.getSize(), 0);

  if (total < containerWidth) {
    const scale = containerWidth / total;

    const newSizing: Record<string, number> = {};
    columns.forEach((col) => {
      newSizing[col.id] = Math.floor(col.getSize() * scale);
    });

    table.setColumnSizing(newSizing);
  }
}