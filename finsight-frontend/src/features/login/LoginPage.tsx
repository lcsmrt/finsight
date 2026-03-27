import { useLogin } from "@/api/services/useAuthService";
import { PATHS } from "@/app/routing/paths";
import { Button } from "@/components/button/Button";
import { Field, FieldError, FieldLabel } from "@/components/input/base/Field";
import { Input } from "@/components/input/base/Input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/input/base/InputGroup";
import { useAuth } from "@/app/providers/AuthProvider";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeClosed } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().min(1, "Please enter your email").email("Invalid email"),
  password: z.string().min(1, "Please enter your password"),
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

  const { setAccessToken } = useAuth();
  const { mutateAsync: login, isPending: isLoggingIn } = useLogin();

  const navigate = useNavigate();

  const onSubmit = handleSubmit(async (credentials: LoginSchema) => {
    await login({ body: credentials }).then((res) => {
      setAccessToken(res.token);
      navigate(PATHS.home);
    });
  });

  return (
    <>
      <header className="flex flex-1 items-end gap-2">
        <img
          src={"/finsigh-icon.png"}
          alt="FinSight logo"
          className="h-12"
          style={{
            imageRendering: "pixelated",
            filter: "drop-shadow(0 0 10px hsl(var(--primary) / 0.7))",
          }}
        />
      </header>

      <form
        id="login-form"
        className="bg-card ring-primary/15 flex w-xl flex-col items-center gap-5 rounded-lg p-5 ring-1"
        onSubmit={onSubmit}
      >
        <h1 className="text-foreground text-2xl font-bold">Login</h1>

        <div className="flex w-full flex-col gap-3">
          <Field>
            <FieldLabel htmlFor="email-login">Email</FieldLabel>
            <Input
              id="email-login"
              placeholder="Email"
              className="bg-card/70"
              {...register("email")}
            />
            {errors.email && <FieldError>{errors.email.message}</FieldError>}
          </Field>
          <Field>
            <FieldLabel htmlFor="password-login">Password</FieldLabel>
            <InputGroup className="bg-card/70">
              <InputGroupInput
                id="password-login"
                placeholder="Password"
                type={isPasswordVisible ? "text" : "password"}
                {...register("password")}
              />
              <InputGroupAddon align="inline-end">
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
              </InputGroupAddon>
            </InputGroup>
            {errors.password && (
              <FieldError>{errors.password.message}</FieldError>
            )}
          </Field>
        </div>

        <div className="w-full">
          <Button className="w-full" type="submit" isLoading={isLoggingIn}>
            <p className="text-sm font-semibold">Sign in</p>
          </Button>
        </div>

        <div className="flex flex-col items-center">
          <p className="text-muted-foreground text-sm">
            Don’t have an account?
          </p>
          <Button
            type="button"
            variant="link"
            className="h-fit p-0 font-bold"
            onClick={() => navigate(PATHS.registerUser)}
          >
            Create one now
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
