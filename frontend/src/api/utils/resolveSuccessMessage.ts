interface ResolveSuccessMessageParams<TData, TVariables> {
  /**
   * Custom message: a static string or a function that receives the response data
   * and request variables to build the message dynamically.
   */
  message?: string | ((data: TData, variables: TVariables) => string);

  /** The mutation response data, passed to `message` when it is a function. */
  data: TData;

  /** The mutation request variables, passed to `message` when it is a function. */
  variables: TVariables;

  /** Returned when `message` is not provided. */
  fallbackMessage?: string;
}

/**
 * Resolves a success message from a static string, a dynamic function, or a fallback.
 */
export const resolveSuccessMessage = <TData, TVariables>({
  message,
  data,
  variables,
  fallbackMessage,
}: ResolveSuccessMessageParams<TData, TVariables>): string => {
  if (typeof message === "function") return message(data, variables);
  return message ?? fallbackMessage ?? "";
};
