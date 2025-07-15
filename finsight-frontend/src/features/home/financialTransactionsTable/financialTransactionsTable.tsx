import { Table } from "@/components/table";
import { TableCore } from "@/components/table/tableCore";

export const TransactionsTable = () => {
  return (
    <Table<any, any> columns={[]} data={[]}>
      <TableCore />
    </Table>
  );
};
