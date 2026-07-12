import { PlanMember, PlanRole } from "@/api/dtos";
import {
  useGetPlanMembers,
  useRemoveMember,
  useUpdateMemberRole,
} from "@/api/services/usePlanService";
import { useAuth } from "@/app/providers/AuthProvider";
import { Avatar, AvatarFallback } from "@/components/avatar/Avatar";
import { Badge } from "@/components/badge/Badge";
import { Button } from "@/components/button/Button";
import { useConfirm } from "@/components/dialog/useConfirmDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/input/base/Select";
import { Spinner } from "@/components/spinner/Spinner";
import { getFirstAndLastInitials } from "@/utils/string/formatters";
import { Trash2Icon } from "lucide-react";
import { usePlanContext } from "../PlanProvider";
import { ROLE_LABELS, ROLE_OPTIONS } from "../utils/planLabels";

type PlanMembersListProps = {
  planId: number;
};

export const PlanMembersList = ({ planId }: PlanMembersListProps) => {
  const { data: members = [], isLoading } = useGetPlanMembers(planId);
  const { activePlan } = usePlanContext();
  const { user } = useAuth();
  const confirm = useConfirm();
  const { mutate: updateMemberRole } = useUpdateMemberRole();
  const { mutate: removeMember } = useRemoveMember();

  const isOwner = activePlan?.myRole === "OWNER";
  const ownerCount = members.filter((m) => m.role === "OWNER").length;

  const canManage = (member: PlanMember) => {
    if (!isOwner) return false;
    if (member.userId === user?.id) return false;
    if (member.role === "OWNER" && ownerCount <= 1) return false;
    return true;
  };

  const handleRoleChange = (member: PlanMember, role: PlanRole) => {
    if (role === member.role) return;
    updateMemberRole({
      params: { planId, userId: member.userId },
      body: { role },
    });
  };

  const handleRemove = async (member: PlanMember) => {
    const confirmed = await confirm({
      title: "Remover membro",
      description: `Tem certeza que deseja remover ${member.name} deste plano?`,
      confirmLabel: "Remover",
      cancelLabel: "Cancelar",
      variant: "destructive",
    });
    if (confirmed) {
      removeMember({ params: { planId, userId: member.userId } });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-center text-sm">
        Nenhum membro neste plano.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {members.map((member) => (
        <li
          key={member.userId}
          className="border-border flex items-center justify-between gap-3 rounded-lg border p-3"
        >
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>
                {getFirstAndLastInitials(member.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{member.name}</span>
              <span className="text-muted-foreground text-xs">
                {member.email}
              </span>
            </div>
          </div>

          {canManage(member) ? (
            <div className="flex items-center gap-2">
              <Select
                value={member.role}
                onValueChange={(value) =>
                  handleRoleChange(member, value as PlanRole)
                }
              >
                <SelectTrigger className="h-8 w-[150px]">
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
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="text-muted-foreground hover:bg-accent hover:text-destructive rounded"
                onClick={() => handleRemove(member)}
              >
                <Trash2Icon className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Badge variant="secondary">{ROLE_LABELS[member.role]}</Badge>
          )}
        </li>
      ))}
    </ul>
  );
};
