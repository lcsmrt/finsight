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
          The page you tried to access does not exist. <br />
          But on the bright side, you can enjoy Bingus.
        </h1>
        <Button
          variant="link"
          className="text-base"
          onClick={() => navigate(PATHS.home)}
        >
          (Or go back to Home...)
        </Button>
      </div>
      <img src="/assets/bingus.webp" alt="bingus my beloved" className="w-60" />
    </div>
  );
};
