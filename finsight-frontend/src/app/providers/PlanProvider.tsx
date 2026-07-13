import { Plan } from "@/api/dtos";
import { useGetPlans } from "@/api/services/usePlanService";
import { useAuth } from "@/app/providers/AuthProvider";
import {
  getItemFromStorage,
  removeItemFromStorage,
  storeItem,
} from "@/lib/storage";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type PlanContextValue = {
  activePlanId: number | null;
  setActivePlanId: (planId: number) => void;
  activePlan?: Plan;
  plans: Plan[];
  isLoading: boolean;
};

const PlanContext = createContext<PlanContextValue | null>(null);

export const PlanProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  const [activePlanId, setActivePlanIdState] = useState<number | null>(() =>
    getItemFromStorage<number>("activePlanId"),
  );

  const { data: plans = [], isLoading } = useGetPlans({
    enabled: !!user,
  });

  const setActivePlanId = useCallback((planId: number) => {
    setActivePlanIdState(planId);
    storeItem("activePlanId", planId);
  }, []);

  useEffect(() => {
    if (!user) {
      setActivePlanIdState(null);
      removeItemFromStorage("activePlanId");
      return;
    }

    if (plans.length === 0) return;

    const isActiveValid =
      activePlanId != null && plans.some((plan) => plan.id === activePlanId);

    if (!isActiveValid) {
      const fallback = plans.find((plan) => plan.isDefault) ?? plans[0];
      setActivePlanId(fallback.id);
    }
  }, [user, plans, activePlanId]);

  const activePlan = useMemo(
    () => plans.find((plan) => plan.id === activePlanId),
    [plans, activePlanId],
  );

  const value = useMemo(
    () => ({ activePlanId, setActivePlanId, activePlan, plans, isLoading }),
    [activePlanId, setActivePlanId, activePlan, plans, isLoading],
  );

  return (
    <PlanContext.Provider value={value}>{children}</PlanContext.Provider>
  );
};

export const usePlanContext = () => {
  const context = useContext(PlanContext);
  if (!context)
    throw new Error("usePlanContext must be used within a PlanProvider");
  return context;
};
