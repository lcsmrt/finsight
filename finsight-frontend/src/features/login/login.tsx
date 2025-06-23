import { useLogin } from "@/api/services/authService";
import { PATHS } from "@/app/routing/paths";
import { Button } from "@/components/button";
import { Input } from "@/components/input/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, Loader2Icon } from "lucide-react";
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

  const onSubmit = handleSubmit(async (data: LoginSchema) => {
    try {
      await login(data);
      navigate(PATHS.home);
    } catch (error) {
      alert(error);
    }
  });

  return (
    <form
      className="bg-background flex h-screen flex-col items-center justify-center gap-5 px-5"
      onSubmit={onSubmit}
    >
      <div>
        <h1 className="text-primary text-3xl font-bold">FinSight</h1>
      </div>
      <div className="flex w-full flex-col gap-3 md:w-xl">
        <Input
          id="email"
          placeholder="E-mail"
          className="bg-card/70"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          id="password"
          placeholder="Senha"
          className="bg-card/70"
          iconRight={<Eye className="h-5 w-5" />}
          error={errors.password?.message}
          {...register("password")}
        />
      </div>
      <div className="w-full md:w-xl">
        <Button className="w-full" type="submit" disabled={isLoggingIn}>
          <p className="text-sm font-semibold">Entrar</p>
          {isLoggingIn && <Loader2Icon className="animate-spin" />}
        </Button>
      </div>
    </form>
  );
};
