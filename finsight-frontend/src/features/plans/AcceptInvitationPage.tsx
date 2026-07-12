import {
  useAcceptInvitation,
  useGetInvitationPreview,
} from "@/api/services/useInvitationService";
import { PATHS } from "@/app/routing/paths";
import { Button } from "@/components/button/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/card/Card";
import { Spinner } from "@/components/spinner/Spinner";
import { CheckIcon, XIcon } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { usePlanContext } from "./PlanProvider";
import { ROLE_LABELS } from "./utils/planLabels";

export const AcceptInvitationPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setActivePlanId } = usePlanContext();

  const {
    data: preview,
    isLoading,
    isError,
  } = useGetInvitationPreview(token);

  const { mutate: acceptInvitation, isPending } = useAcceptInvitation({
    onSuccess: (result) => {
      setActivePlanId(result.planId);
      navigate(PATHS.home);
    },
  });

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 p-4">
      <Card>
        {isLoading ? (
          <CardContent className="flex justify-center py-10">
            <Spinner />
          </CardContent>
        ) : isError || !preview ? (
          <>
            <CardHeader>
              <CardTitle>Convite inválido</CardTitle>
              <CardDescription>
                Este convite não existe ou não está mais disponível.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => navigate(PATHS.home)}>
                <XIcon className="h-4 w-4" />
                Voltar ao início
              </Button>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle>Você foi convidado</CardTitle>
              <CardDescription>
                {preview.invitedByName} convidou você para o plano{" "}
                <span className="text-foreground font-medium">
                  {preview.planName}
                </span>{" "}
                como {ROLE_LABELS[preview.role]}.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button
                variant="outline"
                type="button"
                disabled={isPending}
                onClick={() => navigate(PATHS.home)}
              >
                <XIcon className="h-4 w-4" />
                Recusar
              </Button>
              <Button
                type="button"
                isLoading={isPending}
                onClick={() => token && acceptInvitation(token)}
              >
                <CheckIcon className="h-4 w-4" />
                Aceitar convite
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
};
