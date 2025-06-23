import { Route, Routes } from "react-router-dom";
import { Login } from "@/features/login/login";
import { Home } from "@/features/home/home";
import { PATHS } from "./paths";

export const AppRouter = () => {
  return (
    <Routes>
      <Route path={PATHS.login} element={<Login />} />

      <Route path={PATHS.home} element={<Home />} />
    </Routes>
  );
};
