import { AxiosError } from "axios";

interface ResolveErrorMessageParams {
  /**
   * Error object that can be an AxiosError, a standard Error, or any unknown type.
   * The function will attempt to extract a user-friendly message from it.
   */
  error: unknown;

  /** A fallback message used when no specific message can be extracted from the error. */
  fallbackMessage?: string;
}

/**
 * Resolves an error message from various error types or returns a fallback message if none is found.
 */
export const resolveErrorMessage = ({
  error,
  fallbackMessage,
}: ResolveErrorMessageParams) => {
  let message: string | string[] | undefined;

  if (error instanceof AxiosError) {
    message = error.response?.data?.message;
  }

  if (error instanceof Error) {
    message = error.message;
  }

  if (Array.isArray(message)) {
    return message.join(", ");
  }

  return message || fallbackMessage || "Ocorreu um erro inesperado";
};
