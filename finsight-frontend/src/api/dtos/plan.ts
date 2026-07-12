export type PlanRole = "OWNER" | "EDITOR" | "CONTRIBUTOR" | "VIEWER";

export type Plan = {
  id: number;
  name: string;
  isDefault: boolean;
  myRole: PlanRole;
};

export type PlanMember = {
  userId: number;
  name: string;
  email: string;
  role: PlanRole;
};

export type CreatePlanRequest = {
  body: {
    name: string;
  };
};

export type UpdateMemberRoleRequest = {
  params: { planId: number; userId: number };
  body: {
    role: PlanRole;
  };
};

export type RemoveMemberRequest = {
  params: { planId: number; userId: number };
};

export type InvitationType = "EMAIL" | "LINK";

export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

export type CreateInvitationRequest = {
  params: { planId: number };
  body: {
    role: PlanRole;
    type: InvitationType;
    email?: string;
  };
};

export type Invitation = {
  id: number;
  token: string;
  role: PlanRole;
  type: InvitationType;
  email?: string;
  status: InvitationStatus;
  link?: string;
};

export type InvitationPreview = {
  planName: string;
  role: PlanRole;
  invitedByName: string;
};

export type AcceptInvitationResponse = {
  planId: number;
  role: PlanRole;
};
