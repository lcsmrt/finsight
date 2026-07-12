import { PlanRole } from "@/api/dtos";

export const ROLE_LABELS: Record<PlanRole, string> = {
  OWNER: "Proprietário",
  EDITOR: "Editor",
  CONTRIBUTOR: "Colaborador",
  VIEWER: "Visualizador",
};

export const ROLE_OPTIONS: PlanRole[] = [
  "EDITOR",
  "CONTRIBUTOR",
  "VIEWER",
];
