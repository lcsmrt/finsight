import { useDeletePlan, useLeavePlan } from "@/api/services/usePlanService";
import { Badge } from "@/components/badge/Badge";
import { Button } from "@/components/button/Button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/card/Card";
import { useConfirm } from "@/components/dialog/useConfirmDialog";
import { SectionHeader } from "@/components/sectionHeader/SectionHeader";
import { Spinner } from "@/components/spinner/Spinner";
import { PATHS } from "@/app/routing/paths";
import { cn } from "@/lib/mergeClasses";
import {
  ArchiveIcon,
  ArrowLeftIcon,
  ArrowRightLeftIcon,
  CheckIcon,
  LogOutIcon,
  PencilIcon,
  PlusIcon,
  UserPlusIcon,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlanContext } from "@/app/providers/PlanProvider";
import { CreatePlanDialog } from "./components/CreatePlanDialog";
import { InvitePlanDialog } from "./components/InvitePlanDialog";
import { PlanInvitationsList } from "./components/PlanInvitationsList";
import { PlanMembersList } from "./components/PlanMembersList";
import { RenamePlanDialog } from "./components/RenamePlanDialog";
import { TransferOwnershipDialog } from "./components/TransferOwnershipDialog";
import { ROLE_LABELS } from "./utils/planLabels";

export const PlansPage = () => {
  const navigate = useNavigate();
  const { plans, activePlan, activePlanId, setActivePlanId, isLoading } =
    usePlanContext();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const confirm = useConfirm();
  const { mutate: deletePlan, isPending: isDeletingPlan } = useDeletePlan();
  const { mutate: leavePlan, isPending: isLeavingPlan } = useLeavePlan();

  const isOwner = activePlan?.myRole === "OWNER";

  const handleArchivePlan = async () => {
    if (!activePlan) return;
    const confirmed = await confirm({
      title: "Arquivar plano",
      description: `Tem certeza que deseja arquivar o plano "${activePlan.name}"? Você poderá contatar o suporte para reverter isso posteriormente.`,
      confirmLabel: "Arquivar",
      cancelLabel: "Cancelar",
      variant: "destructive",
    });
    if (confirmed) {
      deletePlan(activePlan.id);
    }
  };

  const handleLeavePlan = async () => {
    if (!activePlan) return;
    const confirmed = await confirm({
      title: "Sair do plano",
      description: `Tem certeza que deseja sair do plano "${activePlan.name}"?`,
      confirmLabel: "Sair",
      cancelLabel: "Cancelar",
      variant: "destructive",
    });
    if (confirmed) {
      leavePlan(activePlan.id);
    }
  };

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
            <CardAction className="flex items-center gap-2">
              {isOwner ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setIsRenameOpen(true)}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setIsTransferOpen(true)}
                  >
                    <ArrowRightLeftIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:bg-accent hover:text-destructive"
                    isLoading={isDeletingPlan}
                    disabled={isDeletingPlan}
                    onClick={handleArchivePlan}
                  >
                    <ArchiveIcon className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={() => setIsInviteOpen(true)}>
                    <UserPlusIcon className="h-4 w-4" />
                    Convidar
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={isLeavingPlan}
                  disabled={isLeavingPlan}
                  onClick={handleLeavePlan}
                >
                  <LogOutIcon className="h-4 w-4" />
                  Sair do plano
                </Button>
              )}
            </CardAction>
          </CardHeader>
          <CardContent>
            <PlanMembersList planId={activePlan.id} />
          </CardContent>
        </Card>
      )}

      {activePlan && isOwner && (
        <Card>
          <CardHeader>
            <CardTitle>Convites de {activePlan.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <PlanInvitationsList planId={activePlan.id} />
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

      {activePlan && (
        <RenamePlanDialog
          open={isRenameOpen}
          onOpenChange={setIsRenameOpen}
          plan={activePlan}
        />
      )}

      {activePlan && (
        <TransferOwnershipDialog
          open={isTransferOpen}
          onOpenChange={setIsTransferOpen}
          planId={activePlan.id}
        />
      )}
    </div>
  );
};
