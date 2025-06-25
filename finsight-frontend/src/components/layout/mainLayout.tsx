import { Outlet } from "react-router-dom";
import { Navbar } from "./navbar";

export const MainLayout = () => {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
};
