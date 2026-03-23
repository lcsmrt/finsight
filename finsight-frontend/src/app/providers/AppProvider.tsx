import { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./AuthProvider";
import { TanStackQueryProvider } from "./TanStackQueryProvider";
import { ConfirmDialogProvider } from "@/components/dialog/useConfirmDialog";

type AppProviderProps = {
  children: ReactNode;
};

export const AppProvider = ({ children }: AppProviderProps) => {
  return (
    <BrowserRouter>
      <TanStackQueryProvider>
        <AuthProvider>
          <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
        </AuthProvider>
      </TanStackQueryProvider>
    </BrowserRouter>
  );
};
