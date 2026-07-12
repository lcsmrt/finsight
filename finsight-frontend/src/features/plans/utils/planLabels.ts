import { InvitationStatus, PlanRole } from "@/api/dtos";

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

export const STATUS_LABELS: Record<InvitationStatus, string> = {
  PENDING: "Pendente",
  ACCEPTED: "Aceito",
  EXPIRED: "Expirado",
  REVOKED: "Revogado",
};
