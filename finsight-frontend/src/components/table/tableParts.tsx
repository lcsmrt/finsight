import { mergeClasses } from "@/lib/mergeClasses";
import * as React from "react";

const TableBase = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="table"
    className={mergeClasses(
      "bg-background relative caption-bottom text-sm",
      className,
    )}
    {...props}
  />
));

const TableHeaderBase = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="rowgroup"
    className={mergeClasses("bg-background [&_tr]:border-b", className)}
    {...props}
  />
));

const TableBodyBase = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="rowgroup"
    className={mergeClasses("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));

const TableFooterBase = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="rowgroup"
    className={mergeClasses("bg-background border-t", className)}
    {...props}
  />
));

const TableRowBase = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="row"
    className={mergeClasses(
      "even:bg-muted/40 data-[state=selected]:bg-muted flex h-10 border-b transition-colors last:border-0",
      className,
    )}
    {...props}
  />
));

const TableHeadBase = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="columnheader"
    className={mergeClasses(
      "text-muted-foreground relative h-10 truncate px-4 py-1 text-left align-middle font-medium [&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
));

const TableCellBase = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="cell"
    className={mergeClasses(
      "truncate p-2 px-4 align-middle [&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
));

export {
  TableBase,
  TableBodyBase,
  TableCellBase,
  TableFooterBase,
  TableHeadBase,
  TableHeaderBase,
  TableRowBase,
};
