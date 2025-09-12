import { Table } from "@/components/table";
import { TableContent } from "@/components/table/tableContent";

export const FinancialTransactionsTable = () => {
  return (
    <Table tableId="financialTransactionsTable" data={[]} columns={[]}>
      <TableContent />
    </Table>
  );
};
