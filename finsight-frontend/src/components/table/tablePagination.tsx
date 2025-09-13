import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "../button/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../form/select";

export type Pagination = {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
};

type TablePaginationProps = {
  pagination: Partial<Pagination>;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
};

export const TablePagination = ({
  pagination,
  onPageChange,
  onPageSizeChange,
}: TablePaginationProps) => {
  const {
    page = 0,
    size = 0,
    totalElements = 0,
    totalPages = 0,
    first,
    last,
  } = pagination || {};

  const start = (page - 1) * size + 1;
  const end = Math.min(page * size, totalElements);

  return (
    <div className="bg-card sticky bottom-0 left-0 flex min-h-12 w-full items-center border-t px-3">
      {onPageSizeChange && (
        <div className="flex w-full items-center gap-2 text-sm">
          Linhas por página:
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

      <div className="flex w-full min-w-fit items-center justify-end gap-4">
        <span className="text-muted-foreground text-sm">
          {start} – {end} de {totalElements}
        </span>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={first}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={first}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Página {page} de {totalPages || 1}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={last}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={last}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
