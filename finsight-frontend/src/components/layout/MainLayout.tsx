import { Outlet } from "react-router-dom";
import { Navbar } from "../navbar/Navbar";

export const MainLayout = () => {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <header>
        <Navbar />
      </header>
      <main className="flex flex-1 flex-col pt-16">
        <Outlet />
      </main>
    </div>
  );
};
