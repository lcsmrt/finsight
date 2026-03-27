import { FinancialTransactionCategory } from "@/api/dtos";
import {
  useCreateFinancialTransactionCategory,
  useUpdateFinancialTransactionCategory,
} from "@/api/services/useFinancialTransactionCategoryService";
import { Button } from "@/components/button/Button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog/Dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/input/base/Field";
import { Input } from "@/components/input/base/Input";
import { maskCurrency } from "@/utils/string/masks";
import { zodResolver } from "@hookform/resolvers/zod";
import { SaveIcon, XIcon } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const categoryFormSchema = z.object({
  description: z.string().min(1, "Name is required"),
  spendingLimit: z.string(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: FinancialTransactionCategory | null;
  defaultDescription?: string;
  onSuccess?: (category: FinancialTransactionCategory) => void;
}

function buildDefaultValues(
  category?: FinancialTransactionCategory | null,
  defaultDescription?: string,
): CategoryFormValues {
  if (category) {
    return {
      description: category.description,
      spendingLimit:
        category.spendingLimit != null
          ? maskCurrency(String(Math.round(category.spendingLimit * 100)))
          : "",
    };
  }
  return { description: defaultDescription ?? "", spendingLimit: "" };
}

function parseLimit(masked: string): number | undefined {
  const digits = masked.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) / 100 : undefined;
}

export const CategoryFormDialog = ({
  open,
  onOpenChange,
  category,
  defaultDescription,
  onSuccess,
}: CategoryFormDialogProps) => {
  const isEditing = !!category;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: buildDefaultValues(category, defaultDescription),
  });

  useEffect(() => {
    reset(buildDefaultValues(category, defaultDescription));
  }, [category, defaultDescription, open, reset]);

  const {
    mutate: createFinancialTransactionCategory,
    isPending: isCreatingFinancialTransactionCategory,
  } = useCreateFinancialTransactionCategory({
    onSuccess: (created) => {
      onSuccess?.(created);
      onOpenChange(false);
    },
  });

  const {
    mutate: updateFinancialTransactionCategory,
    isPending: isUpdatingFinancialTransactionCategory,
  } = useUpdateFinancialTransactionCategory({
    onSuccess: (updated) => {
      onSuccess?.(updated);
      onOpenChange(false);
    },
  });

  const isPending =
    isCreatingFinancialTransactionCategory ||
    isUpdatingFinancialTransactionCategory;

  const onSubmit = (values: CategoryFormValues) => {
    const spendingLimit = parseLimit(values.spendingLimit);
    if (isEditing) {
      updateFinancialTransactionCategory({
        params: { id: category.id },
        body: {
          description: values.description,
          spendingLimit,
        },
      });
    } else {
      createFinancialTransactionCategory({
        body: {
          description: values.description,
          spendingLimit,
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Category" : "New Category"}
          </DialogTitle>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="category-description">Name</FieldLabel>
            <Input
              id="category-description"
              placeholder="e.g., Food, Transport, Entertainment"
              disabled={isPending}
              aria-invalid={!!errors.description}
              {...register("description")}
            />
            <FieldError errors={[errors.description]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="category-spending-limit">
              Spending Limit{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </FieldLabel>
            {(() => {
              const { onChange, ...rest } = register("spendingLimit");
              return (
                <Input
                  id="category-spending-limit"
                  type="text"
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  disabled={isPending}
                  {...rest}
                  onChange={(e) => {
                    e.target.value = maskCurrency(e.target.value);
                    onChange(e);
                  }}
                />
              );
            })()}
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            <XIcon className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            type="button"
            isLoading={isPending}
            onClick={handleSubmit(onSubmit)}
          >
            <SaveIcon className="h-4 w-4" />
            {isEditing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Provider & hook ─────────────────────────────────────────────────────────

interface CategoryFormDialogContextValue {
  openCreate: (
    defaultDescription?: string,
  ) => Promise<FinancialTransactionCategory | null>;
  openEdit: (
    category: FinancialTransactionCategory,
  ) => Promise<FinancialTransactionCategory | null>;
}

const CategoryFormDialogContext =
  createContext<CategoryFormDialogContextValue | null>(null);

export const useCategoryFormDialog = () => {
  const ctx = useContext(CategoryFormDialogContext);
  if (!ctx)
    throw new Error(
      "useCategoryFormDialog must be used within CategoryFormDialogProvider",
    );
  return ctx;
};

export const CategoryFormDialogProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<FinancialTransactionCategory | null>(null);
  const [createDefaultDesc, setCreateDefaultDesc] = useState("");
  const resolverRef = useRef<
    ((cat: FinancialTransactionCategory | null) => void) | null
  >(null);

  const openCreate = (defaultDescription?: string) => {
    setEditingCategory(null);
    setCreateDefaultDesc(defaultDescription ?? "");
    setOpen(true);
    return new Promise<FinancialTransactionCategory | null>((resolve) => {
      resolverRef.current = resolve;
    });
  };

  const openEdit = (category: FinancialTransactionCategory) => {
    setEditingCategory(category);
    setCreateDefaultDesc("");
    setOpen(true);
    return new Promise<FinancialTransactionCategory | null>((resolve) => {
      resolverRef.current = resolve;
    });
  };

  const handleSuccess = (saved: FinancialTransactionCategory) => {
    resolverRef.current?.(saved);
    resolverRef.current = null;
  };

  const handleClose = () => {
    resolverRef.current?.(null);
    resolverRef.current = null;
    setOpen(false);
  };

  return (
    <CategoryFormDialogContext.Provider value={{ openCreate, openEdit }}>
      {children}
      <CategoryFormDialog
        open={open}
        onOpenChange={(isOpen) => !isOpen && handleClose()}
        category={editingCategory}
        defaultDescription={createDefaultDesc}
        onSuccess={handleSuccess}
      />
    </CategoryFormDialogContext.Provider>
  );
};
