import { useLogin } from "@/api/services/authService";
import { PATHS } from "@/app/routing/paths";
import { Button } from "@/components/button/button";
import { Input } from "@/components/input/input";
import { storeItem } from "@/lib/storage";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeClosed, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Por favor, informe seu e-mail")
    .email("E-mail inválido"),
  password: z.string().min(1, "Por favor, informe sua senha"),
});

type LoginSchema = z.infer<typeof loginSchema>;

export const Login = () => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { mutateAsync: login, isPending: isLoggingIn } = useLogin();

  const navigate = useNavigate();

  const onSubmit = handleSubmit(async (credentials: LoginSchema) => {
    try {
      const data = await login(credentials);
      storeItem("accessToken", data.token);
      navigate(PATHS.home);
    } catch (error: any) {
      alert(error?.response?.data.message);
    }
  });

  return (
    <>
      <header className="flex flex-1 items-end gap-2">
        <Eye className="text-primary h-10 w-10" />
        <h1 className="text-primary text-3xl font-bold">FinSight</h1>
      </header>

      <form
        id="login-form"
        className="bg-card flex w-xl flex-col items-center gap-5 rounded-lg p-5"
        onSubmit={onSubmit}
      >
        <h1 className="text-foreground text-2xl font-bold">Login</h1>

        <div className="flex w-full flex-col gap-3">
          <Input
            id="email-login"
            placeholder="E-mail"
            label="E-mail"
            className="bg-card/70"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            id="password-login"
            placeholder="Senha"
            label="Senha"
            className="bg-card/70"
            iconRight={
              <Button
                className="h-8 w-8 rounded-full p-0"
                variant="ghost"
                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                type="button"
              >
                {isPasswordVisible ? (
                  <Eye className="h-5 w-5" />
                ) : (
                  <EyeClosed className="h-5 w-5" />
                )}
              </Button>
            }
            type={isPasswordVisible ? "text" : "password"}
            error={errors.password?.message}
            {...register("password")}
          />
        </div>

        <div className="w-full">
          <Button className="w-full" type="submit" disabled={isLoggingIn}>
            <p className="text-sm font-semibold">Entrar</p>
            {isLoggingIn && <Loader2Icon className="animate-spin" />}
          </Button>
        </div>

        <div className="flex flex-col items-center">
          <p className="text-muted-foreground text-sm">Não possui uma conta?</p>
          <Button
            type="button"
            variant="link"
            className="h-fit p-0 font-bold"
            onClick={() => navigate(PATHS.registerUser)}
          >
            Crie uma agora
          </Button>
        </div>
      </form>

      <footer className="flex flex-1 flex-col items-center justify-end">
        <p className="text-muted-foreground text-xs">© 2025 Nameless Comp</p>
        <p className="text-muted-foreground text-xs">v0.0.0 - 20250701</p>
      </footer>
    </>
  );
};
