import { UseMutationOptions } from "@tanstack/react-query";
import { MutationOptions } from "../types/mutationOptions";
import { resolveErrorMessage } from "./resolveErrorMessage";
import { resolveSuccessMessage } from "./resolveSuccessMessage";
import { toast } from "sonner";

interface MutationDefaults {
  successMessage?: string;
  errorMessage?: string;
}

/**
 * Builds TanStack mutation callbacks with default toast handling and optional overrides.
 * @param defaults Default messages shown when the caller doesn't provide custom ones.
 * @param options External options that can override messages, toggle toasts, or add extra callbacks.
 */
export function buildMutationOptions<TData, TVariables>(
  defaults: MutationDefaults,
  options?: MutationOptions<TData, TVariables>,
): Pick<UseMutationOptions<TData, Error, TVariables>, "onSuccess" | "onError"> {
  const {
    successMessage,
    errorMessage,
    showSuccessToast = true,
    showErrorToast = true,
    onSuccess,
    onError,
  } = options ?? {};

  return {
    onSuccess: (data, variables) => {
      if (showSuccessToast) {
        toast.success(
          resolveSuccessMessage({
            message: successMessage,
            data,
            variables,
            fallbackMessage: defaults.successMessage,
          }),
        );
      }
      onSuccess?.(data, variables);
    },
    onError: (error) => {
      if (showErrorToast) {
        toast.error(
          resolveErrorMessage({
            error,
            fallbackMessage: errorMessage ?? defaults.errorMessage,
          }),
        );
      }
      onError?.(error);
    },
  };
}
