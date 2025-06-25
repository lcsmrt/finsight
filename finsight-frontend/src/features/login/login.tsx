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
      const { data: accessToken } = await login(credentials);
      storeItem("accessToken", accessToken);
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
      <div className="w-full md:w-xl">
        <Button className="w-full" type="submit" disabled={isLoggingIn}>
          <p className="text-sm font-semibold">Entrar</p>
          {isLoggingIn && <Loader2Icon className="animate-spin" />}
        </Button>
      </div>
    </form>
  );
};
