import { Button } from "@/components/button";
import { Input } from "@/components/input/input";
import { Eye } from "lucide-react";

export const Login = () => {
  return (
    <div className="bg-background flex h-screen flex-col items-center justify-center gap-5 px-5">
      <div>
        <h1 className="text-primary text-3xl font-bold">FinSight</h1>
      </div>
      <div className="flex w-full flex-col gap-3 md:w-xl">
        <Input
          id="username"
          placeholder="Nome de usuário"
          className="bg-card/70"
        />
        <Input
          id="password"
          placeholder="Senha"
          className="bg-card/70"
          iconRight={<Eye className="h-5 w-5" />}
        />
      </div>
      <div className="w-full md:w-xl">
        <Button className="w-full">
          <p className="text-sm font-semibold">Entrar</p>
        </Button>
      </div>
    </div>
  );
};
