import { MainLayout } from "@/components/layout/mainLayout";
import { Home } from "@/features/home/home";
import { Login } from "@/features/login/login";
import { Route, Routes } from "react-router-dom";
import { PATHS } from "./paths";
import { AuthLayout } from "@/components/layout/authLayout";
import { RegisterUser } from "@/features/registerUser/registerUser";

export const AppRouter = () => {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path={PATHS.login} element={<Login />} />
        <Route path={PATHS.registerUser} element={<RegisterUser />} />
      </Route>

      <Route element={<MainLayout />}>
        <Route path={PATHS.home} element={<Home />} />
      </Route>
    </Routes>
  );
};
