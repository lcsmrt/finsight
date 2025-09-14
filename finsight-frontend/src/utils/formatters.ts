import { format } from "date-fns";

/**
 * Formats a numeric value into a localized currency string.
 * @param value Number to be formatted.
 * @param currency Currency code (e.g., "BRL", "USD").
 * @returns Formatted currency string.
 */
export const formatCurrency = (value: number, currency: string): string => {
  const formatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  });
  return formatter.format(value);
};

/**
 * Formats a date using a given format.
 * @param date Date object or ISO string.
 * @param dateFormat Format pattern (date-fns).
 * @returns Formatted date string.
 */
export const formatDate = (date: Date | string, dateFormat: string): string => {
  return format(date, dateFormat);
};

/**
 * Receives a full name and returns the initials of the first and last names.
 * @param name Full name of a person.
 * @returns Initials of the first and last names.
 */
export const getFirstAndLastInitials = (name: string): string => {
  const names = name.split(" ");
  const firstInitial = names[0].charAt(0).toUpperCase();
  const lastInitial = names[names.length - 1].charAt(0).toUpperCase();

  return firstInitial + lastInitial;
};
