import { Outlet } from "react-router-dom";

export const AuthLayout = () => {
  return (
    <main
      className="bg-background relative flex h-dvh flex-col items-center justify-center gap-5 overflow-hidden p-5"
      style={{
        backgroundImage:
          "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }}
    >
      <div className="bg-primary/8 pointer-events-none absolute h-[600px] w-[600px] rounded-full blur-[120px]" />
      <Outlet />
    </main>
  );
};
