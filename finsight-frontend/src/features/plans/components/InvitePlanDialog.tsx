import { Invitation, InvitationType, PlanRole } from "@/api/dtos";
import { useCreateInvitation } from "@/api/services/useInvitationService";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/input/base/Select";
import { zodResolver } from "@hookform/resolvers/zod";
import { CopyIcon, SendIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ROLE_LABELS, ROLE_OPTIONS } from "../utils/planLabels";

const TYPE_LABELS: Record<InvitationType, string> = {
  EMAIL: "E-mail",
  LINK: "Link",
};

const inviteSchema = z
  .object({
    role: z.enum(["EDITOR", "CONTRIBUTOR", "VIEWER"]),
    type: z.enum(["EMAIL", "LINK"]),
    email: z.string().optional(),
    expiresAt: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.type === "EMAIL" && !values.email?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe um e-mail",
        path: ["email"],
      });
    }
  });

type InviteFormValues = z.infer<typeof inviteSchema>;

type InvitePlanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: number;
};

const buildInvitationLink = (invitation: Invitation): string => {
  const relative = invitation.link ?? `/invitations/${invitation.token}`;
  return `${window.location.origin}${relative}`;
};

export const InvitePlanDialog = ({
  open,
  onOpenChange,
  planId,
}: InvitePlanDialogProps) => {
  const [createdInvitation, setCreatedInvitation] = useState<Invitation | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: "VIEWER", type: "EMAIL", email: "", expiresAt: "" },
  });

  useEffect(() => {
    reset({ role: "VIEWER", type: "EMAIL", email: "", expiresAt: "" });
    setCreatedInvitation(null);
  }, [open, reset]);

  const { mutate: createInvitation, isPending } = useCreateInvitation({
    onSuccess: (invitation) => setCreatedInvitation(invitation),
  });

  const type = watch("type");
  const role = watch("role");

  const onSubmit = (values: InviteFormValues) => {
    createInvitation({
      params: { planId },
      body: {
        role: values.role,
        type: values.type,
        email: values.type === "EMAIL" ? values.email?.trim() : undefined,
        expiresAt:
          values.type === "LINK" && values.expiresAt
            ? values.expiresAt
            : undefined,
      },
    });
  };

  const copyLink = () => {
    if (!createdInvitation) return;
    navigator.clipboard.writeText(buildInvitationLink(createdInvitation));
    toast.success("Link copiado para a área de transferência.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Convidar para o plano</DialogTitle>
        </DialogHeader>

        {createdInvitation ? (
          <div className="flex flex-col gap-3">
            {createdInvitation.type === "LINK" ? (
              <>
                <p className="text-muted-foreground text-sm">
                  Compartilhe este link para convidar alguém:
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={buildInvitationLink(createdInvitation)}
                    onFocus={(e) => e.target.select()}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyLink}
                  >
                    <CopyIcon className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">
                Convite enviado para{" "}
                <span className="text-foreground font-medium">
                  {createdInvitation.email}
                </span>
                .
              </p>
            )}

            <DialogFooter>
              <Button type="button" onClick={() => onOpenChange(false)}>
                Concluir
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <Field>
              <FieldLabel>Tipo de convite</FieldLabel>
              <Select
                value={type}
                onValueChange={(value) =>
                  setValue("type", value as InvitationType, {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(v: string) => TYPE_LABELS[v as InvitationType]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">E-mail</SelectItem>
                  <SelectItem value="LINK">Link</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Papel</FieldLabel>
              <Select
                value={role}
                onValueChange={(value) =>
                  setValue("role", value as InviteFormValues["role"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(v: string) => ROLE_LABELS[v as PlanRole]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {ROLE_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {type === "EMAIL" && (
              <Field>
                <FieldLabel htmlFor="invite-email">E-mail</FieldLabel>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="pessoa@email.com"
                  disabled={isPending}
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                <FieldError errors={[errors.email]} />
              </Field>
            )}

            {type === "LINK" && (
              <Field>
                <FieldLabel htmlFor="invite-expires-at">
                  Expira em (opcional)
                </FieldLabel>
                <Input
                  id="invite-expires-at"
                  type="datetime-local"
                  disabled={isPending}
                  aria-invalid={!!errors.expiresAt}
                  {...register("expiresAt")}
                />
                <FieldError errors={[errors.expiresAt]} />
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
                onClick={handleSubmit(onSubmit)}
              >
                <SendIcon className="h-4 w-4" />
                {type === "LINK" ? "Gerar link" : "Enviar convite"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
