import { Plan } from "@/api/dtos";
import { useCreatePlan } from "@/api/services/usePlanService";
import { Button } from "@/components/button/Button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog/Dialog";
import { Field, FieldError, FieldLabel } from "@/components/input/base/Field";
import { Input } from "@/components/input/base/Input";
import { zodResolver } from "@hookform/resolvers/zod";
import { SaveIcon, XIcon } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const createPlanSchema = z.object({
  name: z.string().min(1, "Enter a name for the plan"),
});

type CreatePlanFormValues = z.infer<typeof createPlanSchema>;

type CreatePlanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (plan: Plan) => void;
};

export const CreatePlanDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: CreatePlanDialogProps) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePlanFormValues>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    reset({ name: "" });
  }, [open, reset]);

  const { mutate: createPlan, isPending } = useCreatePlan({
    onSuccess: (plan) => {
      onSuccess?.(plan);
      onOpenChange(false);
    },
  });

  const onSubmit = (values: CreatePlanFormValues) => {
    createPlan({ body: { name: values.name } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New plan</DialogTitle>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="plan-name">Name</FieldLabel>
          <Input
            id="plan-name"
            placeholder="e.g., Household finances"
            disabled={isPending}
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          <FieldError errors={[errors.name]} />
        </Field>

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
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
