import { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./AuthProvider";
import { TanStackQueryProvider } from "./TanStackQueryProvider";
import { ConfirmDialogProvider } from "@/components/dialog/useConfirmDialog";
import { CategoryFormDialogProvider } from "@/features/home/components/transactions/CategoryFormDialog";

type AppProviderProps = {
  children: ReactNode;
};

export const AppProvider = ({ children }: AppProviderProps) => {
  return (
    <BrowserRouter>
      <TanStackQueryProvider>
        <AuthProvider>
          <ConfirmDialogProvider>
            <CategoryFormDialogProvider>{children}</CategoryFormDialogProvider>
          </ConfirmDialogProvider>
        </AuthProvider>
      </TanStackQueryProvider>
    </BrowserRouter>
  );
};
