/**
 * Display currencies — platform balances are stored in USD internally.
 * Rates are approximate for UI display only.
 */
export const CURRENCIES = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', locale: 'en-IN', rate: 83.5 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', locale: 'en-US', rate: 1 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', locale: 'de-DE', rate: 0.92 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', locale: 'en-GB', rate: 0.79 },
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', flag: '🇦🇪', locale: 'ar-AE', rate: 3.67 },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬', locale: 'en-SG', rate: 1.34 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵', locale: 'ja-JP', rate: 149 },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦', locale: 'en-CA', rate: 1.36 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺', locale: 'en-AU', rate: 1.53 },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', flag: '🇧🇷', locale: 'pt-BR', rate: 4.95 },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', flag: '🇨🇭', locale: 'de-CH', rate: 0.88 },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', flag: '🇨🇳', locale: 'zh-CN', rate: 7.24 },
  PKR: { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', flag: '🇵🇰', locale: 'en-PK', rate: 278 },
  BDT: { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', flag: '🇧🇩', locale: 'en-BD', rate: 110 },
  LKR: { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee', flag: '🇱🇰', locale: 'en-LK', rate: 305 },
}

export const CURRENCY_LIST = Object.values(CURRENCIES)

/** Grouped options for profile dropdown (by region / country) */
export const CURRENCY_REGIONS = [
  {
    label: '🇮🇳 India & South Asia',
    codes: ['INR', 'PKR', 'BDT', 'LKR'],
  },
  {
    label: '🇺🇸 Americas',
    codes: ['USD', 'CAD', 'BRL'],
  },
  {
    label: '🇪🇺 Europe',
    codes: ['EUR', 'GBP', 'CHF'],
  },
  {
    label: '🌏 Asia–Pacific',
    codes: ['SGD', 'JPY', 'AUD', 'CNY', 'AED'],
  },
]

export const DEFAULT_CURRENCY = 'USD'

export function isValidCurrency(code) {
  return !!CURRENCIES[code]
}

export function getCurrency(code) {
  return CURRENCIES[code] || CURRENCIES.USD
}

/** Convert USD platform amount → display amount in chosen currency */
export function convertFromUsd(amountUsd, currencyCode) {
  const c = getCurrency(currencyCode)
  return (Number(amountUsd) || 0) * c.rate
}

/** Convert user-entered display amount → USD for API / storage */
export function convertToUsd(amountDisplay, currencyCode) {
  const c = getCurrency(currencyCode)
  const n = Number(amountDisplay) || 0
  if (c.rate <= 0) return n
  return n / c.rate
}

const ZERO_DECIMAL = new Set(['JPY', 'PKR', 'BDT', 'LKR'])

/**
 * Format a USD-denominated platform amount in the user's display currency.
 */
export function formatMoney(amountUsd, currencyCode = DEFAULT_CURRENCY, { compact = false } = {}) {
  const code = isValidCurrency(currencyCode) ? currencyCode : DEFAULT_CURRENCY
  const converted = convertFromUsd(amountUsd, code)
  const maxFrac = ZERO_DECIMAL.has(code) ? 0 : 2

  try {
    return new Intl.NumberFormat(getCurrency(code).locale, {
      style: 'currency',
      currency: code,
      notation: compact && Math.abs(converted) >= 10000 ? 'compact' : 'standard',
      minimumFractionDigits: maxFrac,
      maximumFractionDigits: maxFrac,
    }).format(converted)
  } catch {
    const c = getCurrency(code)
    return `${c.symbol}${converted.toFixed(maxFrac)}`
  }
}

/** Short label for inputs, e.g. "Amount (INR)" */
export function currencyLabel(currencyCode) {
  const c = getCurrency(currencyCode)
  return `${c.name} (${c.code})`
}

/** Guess default currency from country emoji / code on profile */
export function guessCurrencyFromCountry(country) {
  if (!country) return DEFAULT_CURRENCY
  const s = String(country)
  if (s.includes('🇮🇳') || s === 'IN' || /india/i.test(s)) return 'INR'
  if (s.includes('🇬🇧') || s === 'GB' || /uk|britain/i.test(s)) return 'GBP'
  if (s.includes('🇪🇺') || s === 'EU') return 'EUR'
  if (s.includes('🇦🇪')) return 'AED'
  if (s.includes('🇯🇵')) return 'JPY'
  if (s.includes('🇵🇰')) return 'PKR'
  if (s.includes('🇧🇩')) return 'BDT'
  if (s.includes('🇱🇰')) return 'LKR'
  if (s.includes('🇧🇷')) return 'BRL'
  if (s.includes('🇨🇦')) return 'CAD'
  if (s.includes('🇦🇺')) return 'AUD'
  if (s.includes('🇸🇬')) return 'SGD'
  return DEFAULT_CURRENCY
}
