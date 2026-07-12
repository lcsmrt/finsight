import { useGetPlanMembers } from "@/api/services/usePlanService";
import { Avatar, AvatarFallback } from "@/components/avatar/Avatar";
import { Badge } from "@/components/badge/Badge";
import { Spinner } from "@/components/spinner/Spinner";
import { getFirstAndLastInitials } from "@/utils/string/formatters";
import { ROLE_LABELS } from "../utils/planLabels";

type PlanMembersListProps = {
  planId: number;
};

export const PlanMembersList = ({ planId }: PlanMembersListProps) => {
  const { data: members = [], isLoading } = useGetPlanMembers(planId);

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
          <Badge variant="secondary">{ROLE_LABELS[member.role]}</Badge>
        </li>
      ))}
    </ul>
  );
};
