import { TransactionsTable } from "./components/TransactionsTable";

export const Home = () => {
  return (
    <section className="flex flex-col gap-6">
      <TransactionsTable />
    </section>
  );
};
