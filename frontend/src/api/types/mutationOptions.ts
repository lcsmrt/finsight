/**
 * Options for customizing messages, toast and callbacks in mutation operations.
 */
export interface MutationOptions<TData = unknown, TVariables = unknown> {
  /**
   * Custom success message.
   */
  successMessage?: string | ((data: TData, variables: TVariables) => string);

  /**
   * Custom error message.
   */
  errorMessage?: string;

  /**
   * Determines whether to show a success toast (default: true).
   */
  showSuccessToast?: boolean;

  /**
   * Determines whether to show an error toast (default: true).
   */
  showErrorToast?: boolean;

  /**
   * Callback executed on success.
   */
  onSuccess?: (data: TData, variables: TVariables) => void;

  /**
   * Callback executed on error.
   */
  onError?: (error: Error) => void;
}
