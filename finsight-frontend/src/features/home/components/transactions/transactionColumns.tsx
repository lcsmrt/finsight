import { FinancialTransactionCategory } from "@/api/dtos";
import { FinancialTransaction } from "@/api/dtos/financialTransaction";
import { Badge } from "@/components/badge/Badge";
import { Button } from "@/components/button/Button";
import { Input } from "@/components/input/base/Input";
import { cn } from "@/lib/mergeClasses";
import { formatCurrency, formatDate } from "@/utils/string/formatters";
import { maskCurrency, maskDate } from "@/utils/string/masks";
import { ColumnDef } from "@tanstack/react-table";
import { format, isValid, parse } from "date-fns";
import { CopyIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { CategoryCombobox } from "./CategoryCombobox";

export interface InlineSaveBody {
  description?: string;
  amount?: number;
  categoryId?: number;
  startDate?: string;
}

interface TransactionColumnHandlers {
  onDuplicate: (transaction: FinancialTransaction) => void;
  onEdit: (transaction: FinancialTransaction) => void;
  onDelete: (transaction: FinancialTransaction) => void;
  onSave: (id: number, body: InlineSaveBody) => void;
  isDeleting?: boolean;
}

interface EditableCellProps {
  transaction: FinancialTransaction;
  onSave: (id: number, body: InlineSaveBody) => void;
}

const EditableDescriptionCell = ({
  transaction,
  onSave,
}: EditableCellProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(transaction.description);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== transaction.description) {
      onSave(transaction.id, { description: trimmed });
    } else {
      setDraft(transaction.description);
    }
    setEditing(false);
  };

  if (!editing) {
    return (
      <span
        className="cursor-text decoration-dotted underline-offset-2 hover:underline"
        onClick={() => {
          setDraft(transaction.description);
          setEditing(true);
        }}
      >
        {transaction.description}
      </span>
    );
  }

  return (
    <Input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setDraft(transaction.description);
          setEditing(false);
        }
      }}
      className="h-7 min-w-40 text-sm"
    />
  );
};

const EditableAmountCell = ({ transaction, onSave }: EditableCellProps) => {
  const { id, amount, type } = transaction;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const commit = () => {
    const digits = draft.replace(/\D/g, "");
    const newAmount = parseInt(digits, 10) / 100;
    if (digits.length > 0 && newAmount > 0 && newAmount !== amount) {
      onSave(id, { amount: newAmount });
    }
    setEditing(false);
  };

  if (!editing) {
    return (
      <div
        className={cn(
          "cursor-text font-mono decoration-dotted underline-offset-2 hover:underline",
          type === "DEBIT" && "text-destructive",
          type === "CREDIT" && "text-success",
        )}
        onClick={() => {
          setDraft(maskCurrency(String(Math.round(amount * 100))));
          setEditing(true);
        }}
      >
        {type === "DEBIT" ? "- " : ""}
        {formatCurrency(amount, "BRL")}
      </div>
    );
  }

  return (
    <Input
      autoFocus
      type="text"
      inputMode="numeric"
      value={draft}
      onChange={(e) => setDraft(maskCurrency(e.target.value))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setEditing(false);
      }}
      className="h-7 w-32 font-mono text-sm"
    />
  );
};

const EditableCategoryCell = ({ transaction, onSave }: EditableCellProps) => {
  const { id, category, type } = transaction;
  const [editing, setEditing] = useState(false);

  const handleValueChange = (
    newCategory: FinancialTransactionCategory | null | undefined,
  ) => {
    if (newCategory != null) {
      onSave(id, { categoryId: newCategory.id });
    }
    setEditing(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) setEditing(false);
  };

  if (!editing) {
    return (
      <div className="cursor-pointer" onClick={() => setEditing(true)}>
        {category ? (
          <Badge variant="outline">{category.description}</Badge>
        ) : (
          <span className="text-muted-foreground/50 text-xs">—</span>
        )}
      </div>
    );
  }

  return (
    <div className="min-w-44">
      <CategoryCombobox
        value={category ?? null}
        onValueChange={handleValueChange}
        type={type}
        defaultOpen
        onOpenChange={handleOpenChange}
      />
    </div>
  );
};

const EditableDateCell = ({ transaction, onSave }: EditableCellProps) => {
  const displayDate = formatDate(transaction.startDate, "dd/MM/yyyy");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const commit = () => {
    const parsed = parse(draft, "dd/MM/yyyy", new Date());
    if (isValid(parsed)) {
      const newStartDate = format(parsed, "yyyy-MM-dd");
      if (newStartDate !== transaction.startDate.split("T")[0]) {
        onSave(transaction.id, { startDate: newStartDate });
      }
    }
    setEditing(false);
  };

  if (!editing) {
    return (
      <span
        className="cursor-text decoration-dotted underline-offset-2 hover:underline"
        onClick={() => {
          setDraft(displayDate);
          setEditing(true);
        }}
      >
        {displayDate}
      </span>
    );
  }

  return (
    <Input
      autoFocus
      value={draft}
      placeholder="dd/mm/aaaa"
      onChange={(e) => setDraft(maskDate(e.target.value))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setEditing(false);
      }}
      className="h-7 w-28 text-sm"
    />
  );
};

export const buildTransactionColumns = ({
  onDuplicate,
  onEdit,
  onDelete,
  onSave,
  isDeleting,
}: TransactionColumnHandlers): ColumnDef<FinancialTransaction>[] => [
  {
    id: "description",
    accessorKey: "description",
    header: "Description",
    enableSorting: true,
    cell: ({ row }) => (
      <EditableDescriptionCell transaction={row.original} onSave={onSave} />
    ),
  },
  {
    id: "category",
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <EditableCategoryCell transaction={row.original} onSave={onSave} />
    ),
  },
  {
    id: "amount",
    accessorKey: "amount",
    header: "Amount",
    enableSorting: true,
    cell: ({ row }) => (
      <EditableAmountCell transaction={row.original} onSave={onSave} />
    ),
  },
  {
    id: "startDate",
    accessorKey: "startDate",
    header: "Date",
    enableSorting: true,
    cell: ({ row }) => (
      <EditableDateCell transaction={row.original} onSave={onSave} />
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within/row:opacity-100 sm:group-hover/row:opacity-100">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:bg-accent hover:text-foreground rounded p-1"
          onClick={() => onDuplicate(row.original)}
        >
          <CopyIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:bg-accent hover:text-foreground rounded p-1"
          onClick={() => onEdit(row.original)}
        >
          <PencilIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:bg-accent hover:text-destructive rounded p-1"
          disabled={isDeleting}
          onClick={() => onDelete(row.original)}
        >
          <Trash2Icon className="h-4 w-4" />
        </Button>
      </div>
    ),
  },
];
