import { tanStackQueryClient } from "@/api/clients/tanStackQuery";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import { UserProvider } from "./userProvider";

type AppProviderProps = {
  children: ReactNode;
};

export const AppProvider = ({ children }: AppProviderProps) => {
  return (
    <QueryClientProvider client={tanStackQueryClient}>
      <BrowserRouter>
        <UserProvider>{children}</UserProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
