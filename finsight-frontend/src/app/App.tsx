import { AppProvider } from "./providers/AppProvider";
import { AppRouter } from "./routing/AppRouter";

export const App = () => {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
};
