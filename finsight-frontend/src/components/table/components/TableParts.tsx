import * as React from "react";
import { cn } from "@/lib/mergeClasses";

const TableBase = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <table
      ref={ref}
      role="table"
      className={cn("bg-background relative caption-bottom text-sm", className)}
      {...props}
    />
  ),
);

const TableHeaderBase = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    role="rowgroup"
    className={cn("bg-background [&_tr]:border-b", className)}
    {...props}
  />
));

const TableBodyBase = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    role="rowgroup"
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));

const TableFooterBase = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot ref={ref} role="rowgroup" className={cn("bg-background border-t", className)} {...props} />
));

const TableRowBase = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    role="row"
    className={cn(
      "group/row even:bg-muted/40 data-[state=selected]:bg-muted h-10 border-b transition-colors last:border-0",
      className,
    )}
    {...props}
  />
));

const TableHeadBase = React.forwardRef<
  HTMLTableCellElement,
  React.HTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    role="columnheader"
    className={cn(
      "relative text-left h-10 px-4 py-1 text-muted-foreground align-middle font-medium [&:has([role=checkbox])]:pr-0 truncate",
      className,
    )}
    {...props}
  />
));

const TableCellBase = React.forwardRef<
  HTMLTableCellElement,
  React.HTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    role="cell"
    className={cn("p-2 px-4 align-middle [&:has([role=checkbox])]:pr-0 truncate", className)}
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
