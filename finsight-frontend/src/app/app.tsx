import { AppProvider } from "./providers";
import { AppRouter } from "./routing";

export const App = () => {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
};
