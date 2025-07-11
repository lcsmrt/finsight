import { Outlet } from "react-router-dom";

export const AuthLayout = () => {
  return (
    <main className="bg-background flex h-screen flex-col items-center justify-center gap-5 p-5">
      <Outlet />
    </main>
  );
};
