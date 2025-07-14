import { TableFooter } from "./basicTableParts";

type TablePaginationProps = {
  page: number;
  size: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
};

export const TablePagination = ({
  page,
  size,
  totalPages,
  onPageChange,
  onSizeChange,
}: TablePaginationProps) => {
  return (
    <TableFooter>
      <p className="hidden text-sm md:block">
        Página {page} de {totalPages}
      </p>
    </TableFooter>
  );
};
