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
