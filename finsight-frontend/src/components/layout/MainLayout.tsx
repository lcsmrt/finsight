import { Outlet } from "react-router-dom";
import { Navbar } from "../navbar/Navbar";

export const MainLayout = () => {
  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
    </>
  );
};
