import { MainLayout } from "@/components/layout/MainLayout";
import { Home } from "@/features/home/HomePage";
import { Login } from "@/features/login/LoginPage";
import { Route, Routes } from "react-router-dom";
import { PATHS } from "./paths";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { RegisterUser } from "@/features/registerUser/RegisterUserPage";
import { PrivateRoute } from "./privateRoute";
import { NotFound } from "@/features/notFound/NotFoundPage";

export const AppRouter = () => {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path={PATHS.login} element={<Login />} />
        <Route path={PATHS.registerUser} element={<RegisterUser />} />
      </Route>

      <Route element={<PrivateRoute />}>
        <Route element={<MainLayout />}>
          <Route path={PATHS.home} element={<Home />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
