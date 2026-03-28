import { cn } from "@/lib/mergeClasses";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "../button/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../input/base/Select";

export type Pagination = {
  /** Índice da página atual (0-based), espelha o campo `number` do ApiPaginatedResponse */
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

type TablePaginationProps = {
  pagination?: Partial<Pagination>;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  isSticky?: boolean;
};

export const TablePagination = ({
  pagination,
  onPageChange,
  onPageSizeChange,
  isSticky = true,
}: TablePaginationProps) => {
  const {
    number: page = 0,
    size = 0,
    totalElements = 0,
    totalPages = 0,
    first,
    last,
  } = pagination || {};

  const start = totalElements === 0 ? 0 : page * size + 1;
  const end = Math.min((page + 1) * size, totalElements);

  return (
    <div
      className={cn(
        "bg-card flex min-h-12 w-full items-center border-t px-3",
        isSticky && "sticky bottom-0 left-0",
      )}
    >
      {onPageSizeChange && (
        <div className="flex w-full items-center gap-2 text-sm">
          <span className="hidden sm:inline">Lines per page:</span>
          <Select
            value={String(size)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="h-8 w-20">
              <SelectValue>{size}</SelectValue>
            </SelectTrigger>
            <SelectContent side="top">
              {[5, 10, 20, 50].map((s) => (
                <SelectItem
                  key={s}
                  value={String(s)}
                  className="hover:cursor-pointer"
                >
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex w-full items-center justify-end gap-4">
        <span className="text-muted-foreground hidden text-sm sm:block">
          {start} – {end} of {totalElements}
        </span>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(0)}
            disabled={first}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(Math.max(0, page - 1))}
            disabled={first}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-muted-foreground text-xs whitespace-nowrap sm:text-sm">
            Page {page + 1} of {totalPages || 1}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
            disabled={last}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(totalPages - 1)}
            disabled={last}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
