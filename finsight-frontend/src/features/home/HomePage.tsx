import { FinancialTransactionsTable } from "./components/FinancialTransactionsTable";

export const Home = () => {
  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <FinancialTransactionsTable />
    </div>
  );
};
