import { Plan } from "@/api/dtos";
import { useRenamePlan } from "@/api/services/usePlanService";
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

const renamePlanSchema = z.object({
  name: z.string().min(1, "Informe um nome para o plano"),
});

type RenamePlanFormValues = z.infer<typeof renamePlanSchema>;

type RenamePlanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Plan;
};

export const RenamePlanDialog = ({
  open,
  onOpenChange,
  plan,
}: RenamePlanDialogProps) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RenamePlanFormValues>({
    resolver: zodResolver(renamePlanSchema),
    defaultValues: { name: plan.name },
  });

  useEffect(() => {
    reset({ name: plan.name });
  }, [open, plan.name, reset]);

  const { mutate: renamePlan, isPending } = useRenamePlan({
    onSuccess: () => onOpenChange(false),
  });

  const onSubmit = (values: RenamePlanFormValues) => {
    renamePlan({ params: { planId: plan.id }, body: { name: values.name } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Renomear plano</DialogTitle>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="rename-plan-name">Nome</FieldLabel>
          <Input
            id="rename-plan-name"
            placeholder="Ex.: Finanças da casa"
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
            Cancelar
          </Button>
          <Button
            type="button"
            isLoading={isPending}
            onClick={handleSubmit(onSubmit)}
          >
            <SaveIcon className="h-4 w-4" />
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
