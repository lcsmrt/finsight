import { Toaster } from "@/components/sonner/Sonner";
import { AppProvider } from "./providers/AppProvider";
import { AppRouter } from "./routing/AppRouter";

export const App = () => {
  return (
    <AppProvider>
      <Toaster />
      <AppRouter />
    </AppProvider>
  );
};
