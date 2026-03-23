import type { UseQueryOptions } from "@tanstack/react-query";

/**
 * Options for customizing query behavior, accepts all options from `UseQueryOptions` except the query key.
 */
export type QueryOptions<TData = unknown> = Omit<
  UseQueryOptions<TData>,
  "queryKey"
>;
