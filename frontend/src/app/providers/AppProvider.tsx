import { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./AuthProvider";
import { PlanProvider } from "./PlanProvider";
import { TanStackQueryProvider } from "./TanStackQueryProvider";
import { ConfirmDialogProvider } from "@/components/dialog/useConfirmDialog";
import { CategoryFormDialogProvider } from "@/features/home/components/transactions/CategoryFormDialog";
import { SeriesScopeDialogProvider } from "@/features/home/components/transactions/SeriesScopeDialog";

type AppProviderProps = {
  children: ReactNode;
};

export const AppProvider = ({ children }: AppProviderProps) => {
  return (
    <BrowserRouter>
      <TanStackQueryProvider>
        <AuthProvider>
          <PlanProvider>
            <ConfirmDialogProvider>
              <SeriesScopeDialogProvider>
                <CategoryFormDialogProvider>
                  {children}
                </CategoryFormDialogProvider>
              </SeriesScopeDialogProvider>
            </ConfirmDialogProvider>
          </PlanProvider>
        </AuthProvider>
      </TanStackQueryProvider>
    </BrowserRouter>
  );
};
