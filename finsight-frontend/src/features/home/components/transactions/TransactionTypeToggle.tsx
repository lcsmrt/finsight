import { cn } from "@/lib/mergeClasses";
import { FinancialTransactionType } from "@/api/dtos/financialTransaction";
import { Button } from "@/components/button/Button";
import { BanknoteArrowDownIcon, BanknoteArrowUpIcon } from "lucide-react";

interface TransactionTypeToggleProps {
  value: FinancialTransactionType;
  onChange: (value: FinancialTransactionType) => void;
  disabled?: boolean;
}

export const TransactionTypeToggle = ({
  value,
  onChange,
  disabled,
}: TransactionTypeToggleProps) => {
  return (
    <div className="flex w-full gap-2">
      <Button
        type="button"
        variant="ghost"
        disabled={disabled}
        onClick={() => onChange("DEBIT")}
        className={cn(
          "flex-1 border",
          value === "DEBIT"
            ? "border-destructive/30 bg-destructive/15 text-destructive hover:bg-destructive/20 hover:text-destructive"
            : "border-border text-muted-foreground hover:border-destructive/30 hover:text-destructive hover:bg-transparent",
        )}
      >
        <BanknoteArrowDownIcon className="h-4 w-4" />
        Debit
      </Button>
      <Button
        type="button"
        variant="ghost"
        disabled={disabled}
        onClick={() => onChange("CREDIT")}
        className={cn(
          "flex-1 border",
          value === "CREDIT"
            ? "border-success/30 bg-success/15 text-success hover:bg-success/20 hover:text-success"
            : "border-border text-muted-foreground hover:border-success/30 hover:text-success hover:bg-transparent",
        )}
      >
        <BanknoteArrowUpIcon className="h-4 w-4" />
        Credit
      </Button>
    </div>
  );
};
