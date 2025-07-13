import { Outlet } from "react-router-dom";
import { Navbar } from "./navbar";
import { useUser } from "@/app/providers/userProvider";
import { useControlledGetUserProfile } from "@/api/services/authService";
import { useEffect } from "react";

export const MainLayout = () => {
  const { setUser } = useUser();
  const { mutateAsync: getUserProfile } = useControlledGetUserProfile();

  const updateUserProfile = async () => {
    try {
      const userProfile = await getUserProfile();
      setUser(userProfile);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    updateUserProfile();
  }, []);

  return (
    <main>
      <Navbar />
      <Outlet />
    </main>
  );
};
