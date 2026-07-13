import { InvitationStatus, PlanRole } from "@/api/dtos";

export const ROLE_LABELS: Record<PlanRole, string> = {
  OWNER: "Owner",
  EDITOR: "Editor",
  CONTRIBUTOR: "Contributor",
  VIEWER: "Viewer",
};

export const ROLE_OPTIONS: PlanRole[] = [
  "EDITOR",
  "CONTRIBUTOR",
  "VIEWER",
];

export const STATUS_LABELS: Record<InvitationStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
};
