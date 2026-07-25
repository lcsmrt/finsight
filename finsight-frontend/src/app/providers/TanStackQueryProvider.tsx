import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

export const tanStackQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

type TanStackQueryProviderProps = {
  children: ReactNode;
};

export const TanStackQueryProvider = ({
  children,
}: TanStackQueryProviderProps) => {
  return (
    <QueryClientProvider client={tanStackQueryClient}>
      {children}
    </QueryClientProvider>
  );
};
