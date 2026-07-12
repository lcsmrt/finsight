import { Invitation, InvitationStatus } from "@/api/dtos";
import {
  useGetPlanInvitations,
  useRevokeInvitation,
} from "@/api/services/useInvitationService";
import { Badge } from "@/components/badge/Badge";
import { Button } from "@/components/button/Button";
import { useConfirm } from "@/components/dialog/useConfirmDialog";
import { Spinner } from "@/components/spinner/Spinner";
import { format } from "date-fns";
import { Trash2Icon } from "lucide-react";
import { ROLE_LABELS, STATUS_LABELS } from "../utils/planLabels";

type PlanInvitationsListProps = {
  planId: number;
};

const STATUS_VARIANTS: Record<
  InvitationStatus,
  "secondary" | "success" | "outline" | "destructive"
> = {
  PENDING: "secondary",
  ACCEPTED: "success",
  EXPIRED: "outline",
  REVOKED: "destructive",
};

const invitationLabel = (invitation: Invitation): string =>
  invitation.type === "EMAIL"
    ? (invitation.email ?? "Convite por e-mail")
    : "Convite por link";

export const PlanInvitationsList = ({ planId }: PlanInvitationsListProps) => {
  const { data: invitations = [], isLoading } =
    useGetPlanInvitations(planId);
  const confirm = useConfirm();
  const { mutate: revokeInvitation } = useRevokeInvitation();

  const handleRevoke = async (invitation: Invitation) => {
    const confirmed = await confirm({
      title: "Revogar convite",
      description: `Tem certeza que deseja revogar o convite para ${invitationLabel(invitation)}?`,
      confirmLabel: "Revogar",
      cancelLabel: "Cancelar",
      variant: "destructive",
    });
    if (confirmed) {
      revokeInvitation({ params: { planId, invitationId: invitation.id } });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        Nenhum convite criado para este plano.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {invitations.map((invitation) => (
        <li
          key={invitation.id}
          className="border-border flex items-center justify-between gap-3 rounded-lg border p-3"
        >
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              {invitationLabel(invitation)}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline">{ROLE_LABELS[invitation.role]}</Badge>
              <Badge variant={STATUS_VARIANTS[invitation.status]}>
                {STATUS_LABELS[invitation.status]}
              </Badge>
              {invitation.expiresAt && (
                <span className="text-muted-foreground text-xs">
                  Expira em{" "}
                  {format(new Date(invitation.expiresAt), "dd/MM/yyyy HH:mm")}
                </span>
              )}
            </div>
          </div>

          {invitation.status === "PENDING" && (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="text-muted-foreground hover:bg-accent hover:text-destructive rounded"
              onClick={() => handleRevoke(invitation)}
            >
              <Trash2Icon className="h-4 w-4" />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
};
