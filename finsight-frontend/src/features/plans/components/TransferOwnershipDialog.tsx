import {
  useGetPlanMembers,
  useTransferOwnership,
} from "@/api/services/usePlanService";
import { Button } from "@/components/button/Button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog/Dialog";
import { Field, FieldLabel } from "@/components/input/base/Field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/input/base/Select";
import { Spinner } from "@/components/spinner/Spinner";
import { ArrowRightLeftIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";

type TransferOwnershipDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: number;
};

export const TransferOwnershipDialog = ({
  open,
  onOpenChange,
  planId,
}: TransferOwnershipDialogProps) => {
  const { data: members = [], isLoading } = useGetPlanMembers(planId, {
    enabled: open,
  });
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  useEffect(() => {
    setSelectedUserId("");
  }, [open]);

  const candidates = members.filter((member) => member.role !== "OWNER");

  const { mutate: transferOwnership, isPending } = useTransferOwnership({
    onSuccess: () => onOpenChange(false),
  });

  const onSubmit = () => {
    if (!selectedUserId) return;
    transferOwnership({
      params: { planId },
      body: { newOwnerUserId: Number(selectedUserId) },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Transferir propriedade</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : candidates.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Não há outros membros para transferir a propriedade.
          </p>
        ) : (
          <Field>
            <FieldLabel>Novo proprietário</FieldLabel>
            <Select
              value={selectedUserId}
              onValueChange={(value) => setSelectedUserId(value ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um membro" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((member) => (
                  <SelectItem
                    key={member.userId}
                    value={String(member.userId)}
                  >
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Você passará a ser Editor deste plano.
            </p>
          </Field>
        )}

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
            disabled={!selectedUserId || candidates.length === 0}
            onClick={onSubmit}
          >
            <ArrowRightLeftIcon className="h-4 w-4" />
            Transferir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
