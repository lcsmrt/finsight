import { QueryClient } from "@tanstack/react-query";

export const tanStackQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});