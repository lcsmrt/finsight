type CurrencyOption =
  | "BRL"
  | "USD"
  | "EUR"
  | "GBP"
  | "JPY"
  | "CNY"
  | "INR"
  | "AUD"
  | "CAD"
  | "CHF"
  | "HKD";

const CURRENCY_LOCALES: Record<CurrencyOption, string> = {
  BRL: "pt-BR",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  JPY: "ja-JP",
  CNY: "zh-CN",
  INR: "en-IN",
  AUD: "en-AU",
  CAD: "en-CA",
  CHF: "de-CH",
  HKD: "zh-HK",
};

/**
 * Masks a raw input string as a date in dd/MM/yyyy format.
 * Non-digit characters are stripped; separators are inserted automatically.
 *
 * @example
 * maskDate("01012024") // "01/01/2024"
 * maskDate("010")      // "01/0"
 */
export const maskDate = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

/**
 * Masks a raw input string as a formatted currency value.
 * Non-digit characters are stripped; the remaining digits are treated as
 * the smallest currency unit (cents for BRL/USD/EUR…, yen for JPY).
 *
 * @example
 * maskCurrency("1234")        // "R$ 12,34"   (BRL default)
 * maskCurrency("1234", "USD") // "$12.34"
 */
export const maskCurrency = (
  value: string,
  currency: CurrencyOption = "BRL",
): string => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  const amount = parseInt(digits, 10) / 100;

  return amount.toLocaleString(CURRENCY_LOCALES[currency], {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
