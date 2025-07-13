import { PATHS } from "@/app/routing/paths";
import { Button } from "@/components/button/button";
import { useNavigate } from "react-router-dom";

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-background flex h-screen flex-col items-center justify-center gap-8">
      <div className="flex flex-col items-center">
        <h1 className="text-primary text-4xl font-bold">404</h1>
        <h1 className="text-center text-lg">
          A página que você tentou acessar não existe. <br />
          Mas em compensação, você pode apreciar o Bingus.
        </h1>
        <Button
          variant="link"
          className="text-base"
          onClick={() => navigate(PATHS.home)}
        >
          (Ou voltar para a Home...)
        </Button>
      </div>
      <img src="/assets/bingus.webp" alt="bingus my beloved" className="w-60" />
    </div>
  );
};
