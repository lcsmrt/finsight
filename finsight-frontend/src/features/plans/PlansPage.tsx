import { Badge } from "@/components/badge/Badge";
import { Button } from "@/components/button/Button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/card/Card";
import { SectionHeader } from "@/components/sectionHeader/SectionHeader";
import { Spinner } from "@/components/spinner/Spinner";
import { PATHS } from "@/app/routing/paths";
import { cn } from "@/lib/mergeClasses";
import { ArrowLeftIcon, CheckIcon, PlusIcon, UserPlusIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlanContext } from "./PlanProvider";
import { CreatePlanDialog } from "./components/CreatePlanDialog";
import { InvitePlanDialog } from "./components/InvitePlanDialog";
import { PlanMembersList } from "./components/PlanMembersList";
import { ROLE_LABELS } from "./utils/planLabels";

export const PlansPage = () => {
  const navigate = useNavigate();
  const { plans, activePlan, activePlanId, setActivePlanId, isLoading } =
    usePlanContext();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const canInvite = activePlan?.myRole === "OWNER";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4">
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        onClick={() => navigate(PATHS.home)}
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Voltar
      </Button>

      <SectionHeader
        title="Planos"
        subtitle="Gerencie seus planos e alterne entre eles."
      >
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>
          <PlusIcon className="h-4 w-4" />
          Novo plano
        </Button>
      </SectionHeader>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {plans.map((plan) => {
            const isActive = plan.id === activePlanId;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setActivePlanId(plan.id)}
                className={cn(
                  "border-border bg-card hover:border-primary/50 flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors",
                  isActive && "border-primary ring-primary/30 ring-1",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{plan.name}</span>
                  {isActive && <CheckIcon className="text-primary h-4 w-4" />}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary">{ROLE_LABELS[plan.myRole]}</Badge>
                  {plan.isDefault && <Badge variant="outline">Padrão</Badge>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {activePlan && (
        <Card>
          <CardHeader>
            <CardTitle>Membros de {activePlan.name}</CardTitle>
            {canInvite && (
              <CardAction>
                <Button size="sm" onClick={() => setIsInviteOpen(true)}>
                  <UserPlusIcon className="h-4 w-4" />
                  Convidar
                </Button>
              </CardAction>
            )}
          </CardHeader>
          <CardContent>
            <PlanMembersList planId={activePlan.id} />
          </CardContent>
        </Card>
      )}

      <CreatePlanDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={(plan) => setActivePlanId(plan.id)}
      />

      {activePlan && (
        <InvitePlanDialog
          open={isInviteOpen}
          onOpenChange={setIsInviteOpen}
          planId={activePlan.id}
        />
      )}
    </div>
  );
};
