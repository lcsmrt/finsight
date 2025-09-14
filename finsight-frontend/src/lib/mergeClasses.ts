import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Conditionally combines CSS classes and resolves Tailwind conflicts.
 * Uses `clsx` for conditional logic and `twMerge` for merging.
 * @param classes Class values.
 * @returns Combined class string.
 */
export function mergeClasses(...classes: ClassValue[]): string {
  const combined = clsx(...classes);
  return twMerge(combined);
}
