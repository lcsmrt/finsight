import { useRegisterUser } from "@/api/services/authService";
import { PATHS } from "@/app/routing/paths";
import { Button } from "@/components/button/button";
import { Input } from "@/components/input/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeClosed, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import z from "zod";

const registerUserSchema = z.object({
  name: z.string().min(1, "Por favor, informe seu nome completo"),
  email: z
    .string()
    .min(1, "Por favor, informe seu e-mail")
    .email("E-mail inválido"),
  password: z.string().min(1, "Por favor, informe sua senha"),
});

type RegisterUserSchema = z.infer<typeof registerUserSchema>;

export const RegisterUser = () => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm({
    resolver: zodResolver(registerUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const { mutateAsync: registerUuser, isPending: isRegisteringUser } =
    useRegisterUser();

  const navigate = useNavigate();

  const onSubmit = handleSubmit(async (credentials: RegisterUserSchema) => {
    try {
      await registerUuser(credentials);
      navigate(PATHS.login);
    } catch (error) {
      console.error(error);
    }
  });

  return (
    <>
      <header className="flex flex-1 items-end gap-2">
        <Eye className="text-primary h-10 w-10" />
        <h1 className="text-primary text-3xl font-bold">FinSight</h1>
      </header>

      <form
        id="register-user-form"
        className="bg-card flex w-xl flex-col items-center gap-5 rounded-lg p-5"
        onSubmit={onSubmit}
        autoComplete="off"
      >
        <h1 className="text-foreground text-2xl font-bold">Registre-se</h1>

        <div className="flex w-full flex-col gap-3">
          <Input
            id="name-register-user"
            label="Nome"
            placeholder="Nome completo"
            className="bg-card/70"
            error={errors.name?.message}
            autoComplete="off"
            {...register("name")}
          />
          <Input
            id="email-reregister-user"
            label="E-mail"
            placeholder="E-mail"
            className="bg-card/70"
            error={errors.email?.message}
            autoComplete="off"
            {...register("email")}
          />
          <Input
            id="password-register-user"
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
            autoComplete="new-password"
            {...register("password")}
          />
        </div>

        <div className="w-full">
          <p className="text-muted-foreground text-center text-sm">
            Ao clicar em entrar, você concorda com os{" "}
            <strong>Termos de Serviço</strong> da Finsight e reconhece estar
            sujeito à nossa <strong>Política de Privacidade</strong>.{" "}
          </p>
        </div>

        <div className="w-full">
          <Button className="w-full" type="submit" disabled={isRegisteringUser}>
            <p className="text-sm font-semibold">Registrar</p>
            {isRegisteringUser && <Loader2Icon className="animate-spin" />}
          </Button>
        </div>

        <div className="flex flex-col items-center">
          <p className="text-muted-foreground text-sm">Já possui uma conta?</p>
          <Button
            type="button"
            variant="link"
            className="h-fit p-0 font-bold"
            onClick={() => navigate(PATHS.login)}
          >
            Entrar
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
