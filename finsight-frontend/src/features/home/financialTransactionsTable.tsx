import { Table } from "@/components/table";
import { TableContent } from "@/components/table/tableContent";

export const TransactionsTable = () => {
  return (
    <Table<any, any> columns={[]} data={[]}>
      <TableContent />
    </Table>
  );
};
