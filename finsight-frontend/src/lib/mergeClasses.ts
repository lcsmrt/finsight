import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina classes CSS condicionalmente e resolve conflitos do Tailwind.
 * Usa `clsx` para lógica condicional e `twMerge` para unificar classes.
 */
export function mergeClasses(...classes: ClassValue[]): string {
  const combined = clsx(...classes);
  return twMerge(combined);
}
