import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Table, TableContent, TablePagination } from "./index";

type User = {
  id: number;
  name: string;
  email: string;
  age: number;
};

const mockData: User[] = Array.from({ length: 42 }, (_, i) => ({
  id: i + 1,
  name: `Usuário ${i + 1}`,
  email: `user${i + 1}@mail.com`,
  age: 18 + (i % 20),
}));

const columns = [
  {
    accessorKey: "id",
    header: "ID",
    enableSorting: true,
    size: 60,
  },
  {
    accessorKey: "name",
    header: "Nome",
    enableSorting: true,
  },
  {
    accessorKey: "email",
    header: "E-mail",
  },
  {
    accessorKey: "age",
    header: "Idade",
    enableSorting: true,
    size: 80,
  },
];

const meta: Meta<typeof Table> = {
  title: "Table",
  component: Table,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof Table>;

export const Default: Story = {
  render: () => {
    const [page, setPage] = useState(1);
    const [size, setSize] = useState(10);

    const start = (page - 1) * size;
    const end = start + size;
    const paginatedData = mockData.slice(start, end);

    const pagination = {
      page,
      size,
      totalElements: mockData.length,
      totalPages: Math.ceil(mockData.length / size),
      first: page === 1,
      last: page === Math.ceil(mockData.length / size),
    };

    return (
      <div className="mx-auto max-w-3xl rounded border">
        <Table<User>
          data={paginatedData}
          columns={columns}
          tableId="user-table"
        >
          <TableContent />
          <TablePagination
            pagination={pagination}
            onPageChange={setPage}
            onPageSizeChange={setSize}
          />
        </Table>
      </div>
    );
  },
};
