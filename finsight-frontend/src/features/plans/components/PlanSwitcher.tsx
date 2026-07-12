import { PATHS } from "@/app/routing/paths";
import { Button } from "@/components/button/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/dropdown/Dropdown";
import { ChevronsUpDownIcon, PlusIcon, SettingsIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePlanContext } from "../PlanProvider";
import { CreatePlanDialog } from "./CreatePlanDialog";

export const PlanSwitcher = () => {
  const navigate = useNavigate();
  const { plans, activePlan, activePlanId, setActivePlanId } = usePlanContext();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="max-w-52 justify-between gap-2"
            >
              <span className="truncate">
                {activePlan?.name ?? "Selecionar plano"}
              </span>
              <ChevronsUpDownIcon className="text-muted-foreground" />
            </Button>
          }
        />

        <DropdownMenuContent className="min-w-52" align="start">
          <DropdownMenuLabel>Planos</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={activePlanId != null ? String(activePlanId) : ""}
            onValueChange={(value) => setActivePlanId(Number(value))}
          >
            {plans.map((plan) => (
              <DropdownMenuRadioItem key={plan.id} value={String(plan.id)}>
                <span className="truncate">{plan.name}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setIsCreateOpen(true)}>
            <PlusIcon />
            Novo plano
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate(PATHS.plans)}>
            <SettingsIcon />
            Gerenciar planos
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreatePlanDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={(plan) => setActivePlanId(plan.id)}
      />
    </>
  );
};
