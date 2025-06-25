import { MainLayout } from "@/components/layout/mainLayout";
import { Home } from "@/features/home/home";
import { Login } from "@/features/login/login";
import { Route, Routes } from "react-router-dom";
import { PATHS } from "./paths";

export const AppRouter = () => {
  return (
    <Routes>
      <Route path={PATHS.login} element={<Login />} />

      <Route element={<MainLayout />}>
        <Route path={PATHS.home} element={<Home />} />
      </Route>
    </Routes>
  );
};
