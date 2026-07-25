import { cn } from "@/lib/mergeClasses";
import { useState } from "react";
import { OverviewTab } from "./components/overview/OverviewTab";
import { TransactionsTab } from "./components/transactions/TransactionsTab";
import { Button } from "@/components/button/Button";

type Tab = "overview" | "transactions";

const tabs: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "transactions", label: "Transactions" },
];

export const Home = () => {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex border-b px-4">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            variant="ghost"
            className={cn(
              "-mb-px rounded-none border-0 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === "overview" ? <OverviewTab /> : <TransactionsTab />}
    </div>
  );
};
