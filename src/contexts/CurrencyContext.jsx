import { createContext, useContext, useCallback, useMemo } from 'react'
import { useAuth } from './AuthContext'
import api from '../services/api'
import {
  CURRENCY_LIST,
  CURRENCY_REGIONS,
  DEFAULT_CURRENCY,
  formatMoney,
  getCurrency,
  isValidCurrency,
  guessCurrencyFromCountry,
  convertToUsd,
} from '../utils/currency'

const CurrencyContext = createContext(null)

export function CurrencyProvider({ children }) {
  const { user, updateUser } = useAuth()

  const currency = useMemo(() => {
    const saved = user?.preferred_currency || localStorage.getItem('tradearena_currency')
    if (saved && isValidCurrency(saved)) return saved
    const guessed = guessCurrencyFromCountry(user?.country)
    return isValidCurrency(guessed) ? guessed : DEFAULT_CURRENCY
  }, [user?.preferred_currency, user?.country])

  const setCurrency = useCallback(async (code) => {
    if (!isValidCurrency(code)) return
    updateUser({ preferred_currency: code })
    localStorage.setItem('tradearena_currency', code)
    try {
      await api.updateProfile({ preferred_currency: code })
    } catch (_) {
      // Saved locally if backend offline
    }
  }, [updateUser])

  const format = useCallback(
    (amountUsd, options) => formatMoney(amountUsd, currency, options),
    [currency]
  )

  const toUsd = useCallback(
    (displayAmount) => convertToUsd(displayAmount, currency),
    [currency]
  )

  const info = useMemo(() => getCurrency(currency), [currency])

  const value = useMemo(() => ({
    currency,
    currencyInfo: info,
    currencies: CURRENCY_LIST,
    currencyRegions: CURRENCY_REGIONS,
    setCurrency,
    format,
    formatMoney: format,
    toUsd,
  }), [currency, info, setCurrency, format, toUsd, CURRENCY_REGIONS])

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider')
  return ctx
}
