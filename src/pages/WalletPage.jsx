import { useEffect, useState } from 'react'

import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { useNotification } from '../contexts/NotificationContext'
import { convertFromUsd } from '../utils/currency'
import api from '../services/api'

const PAYMENT_METHODS = [
  { id: 'crypto', label: '₿ Crypto', icon: '₿' },
  { id: 'violetv_pay', label: '🟪 VioletPay', icon: '🟪' },
  { id: 'upi', label: '📱 UPI', icon: '📱' },
  { id: 'stripe', label: '💳 Card', icon: '💳' },
  { id: 'bank', label: '🏦 Bank', icon: '🏦' },
]

export default function WalletPage() {
  const { user, deposit, withdraw, refreshUser } = useAuth()
  const { format, toUsd, currencyInfo } = useCurrency()
  const { notify } = useNotification()

  const [tab, setTab] = useState('deposit')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('crypto')
  const [loading, setLoading] = useState(false)

  // Card details state
  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvc, setCardCvc] = useState('')

  // Reference numbers state (UPI / Bank / Crypto)
  const [txRef, setTxRef] = useState('')
  const [copied, setCopied] = useState(false)

  const [withdrawalDetails, setWithdrawalDetails] = useState({
    account_holder_name: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch: '',
    upi_id: '',
    wallet_address: '',
    network: '',
    note: '',
  })

  const [paymentConfigs, setPaymentConfigs] = useState({})

  // Real balances from user context
  const realBalance = user?.balance ?? user?.real_balance ?? 0
  const tournamentBalance = user?.tournament_balance ?? 0
  const bonusBalance = user?.bonus_balance ?? 0
  const transactions = user?.transactions ?? []

  const handleCopy = (text) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
    }
    setCopied(true)
    notify('success', 'Copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/payment-configs', { cache: 'no-store' })
        if (!res.ok) return
        const d = await res.json().catch(() => ({}))
        const map = {}
        ;(d.paymentConfigs || []).forEach((c) => {
          map[c.method] = c
        })
        setPaymentConfigs(map)
      } catch (_) {}
    }
    load()
  }, [])

  // Format Card Number (adds spaces every 4 digits)
  const handleCardNumberChange = (value) => {
    const clean = value.replace(/\s?/g, '').replace(/\D/g, '')
    const parts = []
    for (let i = 0; i < clean.length; i += 4) {
      parts.push(clean.substring(i, i + 4))
    }
    if (parts.length > 0) {
      setCardNumber(parts.join(' ').substring(0, 19))
    } else {
      setCardNumber('')
    }
  }

  // Format Expiry Date (MM/YY)
  const handleExpiryChange = (value) => {
    const clean = value.replace(/\D/g, '')
    if (clean.length > 2) {
      setCardExpiry(`${clean.substring(0, 2)}/${clean.substring(2, 4)}`.substring(0, 5))
    } else {
      setCardExpiry(clean)
    }
  }

  const handleAction = async () => {
    const displayNum = parseFloat(amount)
    if (!displayNum || displayNum <= 0) {
      notify('error', 'Please enter a valid amount')
      return
    }

    const numUsd = toUsd(displayNum)
    if (tab === 'withdraw' && numUsd > realBalance) {
      notify('error', 'Insufficient real balance')
      return
    }

    setLoading(true)
    try {
      if (tab === 'deposit') {
        await deposit(numUsd, method, txRef)
        notify('deposit_submitted', `Deposit of ${format(numUsd)} submitted — pending admin approval`)

        // Clear fields
        setCardName('')
        setCardNumber('')
        setCardExpiry('')
        setCardCvc('')
        setTxRef('')
      } else if (tab === 'withdraw') {
        await withdraw(numUsd, method, withdrawalDetails)
        notify('withdrawal_submitted', `Withdrawal of ${format(numUsd)} submitted — pending review`)
      } else {
        if (numUsd > realBalance) {
          notify('error', 'Insufficient real balance to transfer')
          setLoading(false)
          return
        }
        await api.transferToTournamentBalance(numUsd)
        await refreshUser()
        notify('transfer', `${format(numUsd)} transferred to tournament balance`)
      }

      setAmount('')
      setTxRef('')
    } catch (err) {
      notify('error', err?.message || 'Transaction failed')
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = () => {
    const displayNum = parseFloat(amount)
    if (!displayNum || displayNum <= 0) return false

    const numUsd = toUsd(displayNum)

    if (tab === 'deposit') {
      if (method === 'stripe') {
        return (
          cardName.trim().length > 0 &&
          cardNumber.replace(/\s/g, '').length === 16 &&
          cardExpiry.length === 5 &&
          cardCvc.length >= 3
        )
      }

      // UPI / Crypto / Bank / VioletPay require reference
      const minLen = method === 'violetv_pay' ? 3 : 6
      return txRef.trim().length >= minLen
    }

    if (tab === 'withdraw') {
      if (numUsd > realBalance) return false

      if (method === 'bank') {
        return (
          withdrawalDetails.account_holder_name.trim().length > 0 &&
          withdrawalDetails.bank_name.trim().length > 0 &&
          withdrawalDetails.account_number.trim().length > 5 &&
          withdrawalDetails.ifsc_code.trim().length > 3
        )
      }

      if (method === 'upi') {
        return withdrawalDetails.upi_id.trim().length > 2
      }

      if (method === 'crypto') {
        return (
          withdrawalDetails.wallet_address.trim().length > 10 &&
          withdrawalDetails.network.trim().length > 1
        )
      }

      return true
    }

    if (tab === 'transfer') {
      return numUsd <= realBalance
    }

    return true
  }

  // Glassmorphic Credit Card Preview Component
  const CardPreview = () => (
    <div className="relative w-full h-44 rounded-2xl bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border border-white/10 backdrop-blur-xl p-5 flex flex-col justify-between shadow-2xl overflow-hidden mb-4 animate-scale-in">
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl" />
      <div className="flex justify-between items-start">
        <span className="text-xl">💳</span>
        <span className="text-[10px] font-bold text-white/40 tracking-wider">SECURE CHECKOUT</span>
      </div>
      <div>
        <div className="text-[10px] text-white/30 mb-0.5">Card Number</div>
        <div className="text-lg font-mono tracking-widest text-white">{cardNumber || '•••• •••• •••• ••••'}</div>
      </div>
      <div className="flex justify-between items-center">
        <div className="min-w-0 flex-1 pr-4">
          <div className="text-[9px] text-white/30 uppercase">Cardholder</div>
          <div className="text-xs font-semibold text-white/80 uppercase truncate">{cardName || 'YOUR NAME'}</div>
        </div>
        <div className="flex gap-4 shrink-0">
          <div>
            <div className="text-[9px] text-white/30 uppercase">Expires</div>
            <div className="text-xs font-mono text-white/80">{cardExpiry || 'MM/YY'}</div>
          </div>
          <div>
            <div className="text-[9px] text-white/30 uppercase">CVC</div>
            <div className="text-xs font-mono text-white/80">{cardCvc || '•••'}</div>
          </div>
        </div>
      </div>
    </div>
  )

  const QRCodePreview = () => (
    <div className="w-28 h-28 bg-white p-2 rounded-xl flex items-center justify-center mx-auto shadow-lg border border-white/5 mb-3">
      <svg viewBox="0 0 100 100" className="w-full h-full text-dark-950">
        <rect x="0" y="0" width="25" height="25" fill="currentColor" />
        <rect x="5" y="5" width="15" height="15" fill="white" />
        <rect x="8" y="8" width="9" height="9" fill="currentColor" />
        <rect x="75" y="0" width="25" height="25" fill="currentColor" />
        <rect x="80" y="5" width="15" height="15" fill="white" />
        <rect x="83" y="8" width="9" height="9" fill="currentColor" />
        <rect x="0" y="75" width="25" height="25" fill="currentColor" />
        <rect x="5" y="80" width="15" height="15" fill="white" />
        <rect x="8" y="83" width="9" height="9" fill="currentColor" />
        <rect x="35" y="10" width="10" height="15" fill="currentColor" />
        <rect x="50" y="5" width="15" height="10" fill="currentColor" />
        <rect x="30" y="30" width="20" height="20" fill="currentColor" />
        <rect x="55" y="35" width="15" height="15" fill="currentColor" />
        <rect x="10" y="40" width="15" height="15" fill="currentColor" />
        <rect x="35" y="60" width="15" height="20" fill="currentColor" />
        <rect x="70" y="55" width="25" height="25" fill="currentColor" />
        <rect x="60" y="80" width="15" height="15" fill="currentColor" />
        <rect x="85" y="85" width="10" height="10" fill="currentColor" />
      </svg>
    </div>
  )

  return (
    <div className="min-h-screen bg-dark-950">
      <header className="bg-dark-900/80 backdrop-blur-xl border-b border-white/5 px-4 lg:px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link
            to="/dashboard"
            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-display font-bold text-white">💰 Wallet</h1>
            <p className="text-[10px] text-white/30">
              Showing amounts in {currencyInfo.flag} {currencyInfo.name} ({currencyInfo.code}) ·{' '}
              <Link to="/profile" className="text-primary-400 hover:underline">Change</Link>
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-5 border border-accent-500/20">
            <div className="text-xs text-white/30 mb-1">Real Balance</div>
            <div className="text-3xl font-display font-bold text-accent-400">{format(realBalance)}</div>
            <div className="text-[10px] text-white/20 mt-1">Available for withdrawal</div>
          </div>
          <div className="glass-card p-5 border border-primary-500/20">
            <div className="text-xs text-white/30 mb-1">Tournament Balance</div>
            <div className="text-3xl font-display font-bold text-primary-400">{format(tournamentBalance)}</div>
            <div className="text-[10px] text-white/20 mt-1">Active tournament funds</div>
          </div>
          <div className="glass-card p-5 border border-gold-500/20">
            <div className="text-xs text-white/30 mb-1">Bonus Balance</div>
            <div className="text-3xl font-display font-bold text-gold-400">{format(bonusBalance)}</div>
            <div className="text-[10px] text-white/20 mt-1">From referrals &amp; promotions</div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex gap-1 p-1 rounded-xl bg-white/5 w-fit mb-6">
            {['deposit', 'withdraw', 'transfer'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-lg text-sm font-bold capitalize transition-all ${tab === t ? 'bg-primary-500/20 text-primary-400' : 'text-white/30 hover:text-white'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-6 space-y-4">
              {tab === 'withdraw' && (
                <div className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5 text-xs text-white/40">
                  Available: <span className="text-accent-400 font-bold">{format(realBalance)}</span>
                </div>
              )}

              <div>
                <label className="text-xs text-white/40 mb-1 block font-medium">Amount ({currencyInfo.code})</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="glass-input text-xl font-mono"
                  placeholder="0.00"
                  min="0"
                />
                <p className="text-[10px] text-white/25 mt-1">
                  Enter amount in {currencyInfo.name} ({currencyInfo.code}).
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                {[10, 25, 50, 100, 250, 500].map((usd) => (
                  <button
                    key={usd}
                    type="button"
                    onClick={() => setAmount(String(Math.round(convertFromUsd(usd, currencyInfo.code))))}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/5"
                  >
                    {format(usd)}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs text-white/40 mb-2 block font-medium">Payment Method</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMethod(m.id)}
                      className={`p-3 rounded-xl text-center text-xs font-bold transition-all ${
                        method === m.id
                          ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                          : 'bg-white/[0.03] text-white/40 border border-white/5 hover:border-white/10'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="md:col-span-6">
              {tab === 'deposit' && parseFloat(amount) > 0 ? (
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4 animate-scale-in">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5 border-b border-white/5 pb-2">
                    <span>💳</span> Complete Your Deposit
                  </h3>

                  {method === 'stripe' && (
                    <div className="space-y-3">
                      <CardPreview />
                      <div>
                        <label className="text-[10px] text-white/40 uppercase block mb-1">Cardholder Name</label>
                        <input
                          type="text"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          className="glass-input py-2 text-xs"
                          placeholder="e.g. JOHN DOE"
                        />
                      </div>
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-7">
                          <label className="text-[10px] text-white/40 uppercase block mb-1">Card Number</label>
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={(e) => handleCardNumberChange(e.target.value)}
                            className="glass-input py-2 text-xs font-mono"
                            placeholder="4111 2222 3333 4444"
                            maxLength={19}
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="text-[10px] text-white/40 uppercase block mb-1">Expiry</label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={(e) => handleExpiryChange(e.target.value)}
                            className="glass-input py-2 text-xs font-mono text-center"
                            placeholder="MM/YY"
                            maxLength={5}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] text-white/40 uppercase block mb-1">CVC</label>
                          <input
                            type="password"
                            value={cardCvc}
                            onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').substring(0, 3))}
                            className="glass-input py-2 text-xs font-mono text-center"
                            placeholder="•••"
                            maxLength={3}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {method === 'upi' && (
                    <div className="text-center space-y-3">
                      <div className="text-xs text-white/60">Scan QR to pay using any UPI App (GPay, PhonePe, Paytm)</div>
                      <QRCodePreview />
                      <div className="text-sm font-semibold text-accent-400 font-mono">{format(parseFloat(amount) || 0)}</div>
                      <div className="px-3 py-2 rounded-xl bg-primary-500/10 border border-primary-500/20 inline-flex items-center gap-2 text-xs max-w-full">
                        <span className="text-white/40 font-mono">UPI ID:</span>
                        <span className="text-primary-400 font-mono font-bold select-all">
                          {paymentConfigs?.upi?.upi_id || paymentConfigs?.upi?.display_value || 'tradearena@upi'}
                        </span>
                        <button
                          onClick={() => handleCopy(paymentConfigs?.upi?.upi_id || paymentConfigs?.upi?.display_value || 'tradearena@upi')}
                          className="px-2 py-1 bg-white/5 rounded hover:bg-white/10 text-[10px] font-bold text-white transition-all select-none shrink-0"
                        >
                          {copied ? '✓' : 'Copy'}
                        </button>
                      </div>
                      {(paymentConfigs?.upi?.upi_qr_payload) && (
                        <div className="flex gap-1.5 items-center bg-white/5 border border-white/5 rounded-lg p-2 max-w-full">
                          <span className="font-mono text-[10px] text-primary-400 break-all select-all flex-1">
                            {paymentConfigs.upi.upi_qr_payload}
                          </span>
                          <button
                            onClick={() => handleCopy(paymentConfigs.upi.upi_qr_payload)}
                            className="px-2 py-1 bg-white/5 rounded hover:bg-white/10 text-[10px] font-bold text-white transition-all select-none shrink-0"
                          >
                            {copied ? '✓' : 'Copy'}
                          </button>
                        </div>
                      )}
                      <div className="border-t border-white/5 pt-3 text-left">
                        <label className="text-[10px] text-white/40 uppercase block mb-1">UPI Ref / UTR No. (12 digits)</label>
                        <input
                          type="text"
                          value={txRef}
                          onChange={(e) => setTxRef(e.target.value.replace(/\D/g, '').substring(0, 12))}
                          className="glass-input py-2 text-xs font-mono"
                          placeholder={paymentConfigs?.upi?.reference_hint || 'Enter 12-digit transaction ID'}
                          maxLength={12}
                        />
                      </div>
                    </div>
                  )}

                  {method === 'violetv_pay' && (
                    <div className="space-y-3">
                      <QRCodePreview />
                      <div className="text-xs text-white/60 text-center">
                        Scan QR and pay exactly{' '}
                        <span className="text-accent-400 font-bold">{format(parseFloat(amount) || 0)}</span>:
                      </div>
                      <div className="flex gap-1.5 items-center bg-white/5 border border-white/5 rounded-lg p-2 max-w-full">
                        <span className="font-mono text-[10px] text-primary-400 break-all select-all flex-1">
                          {paymentConfigs?.violetv_pay?.qr_payload || 'violetv_pay:violet-pay'}
                        </span>
                        <button
                          onClick={() => handleCopy(paymentConfigs?.violetv_pay?.qr_payload || 'violetv_pay:violet-pay')}
                          className="px-2 py-1 bg-white/5 rounded hover:bg-white/10 text-[10px] font-bold text-white transition-all select-none shrink-0"
                        >
                          {copied ? '✓' : 'Copy'}
                        </button>
                      </div>
                      <div>
                        <label className="text-[10px] text-white/40 uppercase block mb-1">Pay ref</label>
                        <input
                          type="text"
                          value={txRef}
                          onChange={(e) => setTxRef(e.target.value)}
                          className="glass-input py-2 text-xs font-mono"
                          placeholder={paymentConfigs?.violetv_pay?.reference_hint || 'Enter payment reference'}
                        />
                      </div>
                    </div>
                  )}

                  {method === 'crypto' && (
                    <div className="space-y-3">
                      <QRCodePreview />
                      <div className="text-xs text-white/60 text-center">
                        Send exactly <span className="text-accent-400 font-bold">{format(parseFloat(amount) || 0)}</span> of BTC/ETH to address:
                      </div>
                      <div className="flex gap-1.5 items-center bg-white/5 border border-white/5 rounded-lg p-2 max-w-full">
                        <span className="font-mono text-[10px] text-primary-400 break-all select-all flex-1">
                          bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh
                        </span>
                        <button
                          onClick={() => handleCopy('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh')}
                          className="px-2 py-1 bg-white/5 rounded hover:bg-white/10 text-[10px] font-bold text-white transition-all select-none shrink-0"
                        >
                          {copied ? '✓' : 'Copy'}
                        </button>
                      </div>
                      <div>
                        <label className="text-[10px] text-white/40 uppercase block mb-1">Transaction Hash / TxID</label>
                        <input
                          type="text"
                          value={txRef}
                          onChange={(e) => setTxRef(e.target.value)}
                          className="glass-input py-2 text-xs font-mono"
                          placeholder="Paste hash to verify deposit"
                        />
                      </div>
                    </div>
                  )}

                  {method === 'bank' && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs space-y-2">
                        <div className="flex justify-between">
                          <span className="text-white/40">Bank:</span>
                          <span className="text-white font-medium">{paymentConfigs?.bank?.display_value || 'Bank'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/40">Account Name:</span>
                          <span className="text-white font-medium">{paymentConfigs?.bank?.bank_payee_name || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/40">Account No:</span>
                          <span className="text-primary-400 font-mono font-bold select-all">{paymentConfigs?.bank?.bank_account_number || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/40">IFSC Code:</span>
                          <span className="text-primary-400 font-mono font-bold select-all">{paymentConfigs?.bank?.bank_ifsc_code || '—'}</span>
                        </div>
                      </div>

                      {paymentConfigs?.bank?.bank_qr_payload && (
                        <div className="text-center space-y-2">
                          <div className="text-[10px] text-white/40 uppercase font-bold">Optional Bank QR Payload</div>
                          <div className="flex gap-1.5 items-center bg-white/5 border border-white/5 rounded-lg p-2 max-w-full">
                            <span className="font-mono text-[10px] text-primary-400 break-all select-all flex-1">{paymentConfigs.bank.bank_qr_payload}</span>
                            <button
                              onClick={() => handleCopy(paymentConfigs.bank.bank_qr_payload)}
                              className="px-2 py-1 bg-white/5 rounded hover:bg-white/10 text-[10px] font-bold text-white transition-all select-none shrink-0"
                            >
                              {copied ? '✓' : 'Copy'}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t border-white/5 space-y-3">
                        <div>
                          <label className="text-[10px] text-white/40 uppercase block mb-1">Account Holder Name</label>
                          <input
                            type="text"
                            value={withdrawalDetails.account_holder_name}
                            onChange={(e) => setWithdrawalDetails((prev) => ({ ...prev, account_holder_name: e.target.value }))}
                            className="glass-input py-2 text-xs"
                            placeholder="As per bank account"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase block mb-1">Bank Name</label>
                          <input
                            type="text"
                            value={withdrawalDetails.bank_name}
                            onChange={(e) => setWithdrawalDetails((prev) => ({ ...prev, bank_name: e.target.value }))}
                            className="glass-input py-2 text-xs"
                            placeholder="HDFC / SBI / ICICI..."
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] text-white/40 uppercase block mb-1">Account Number</label>
                            <input
                              type="text"
                              value={withdrawalDetails.account_number}
                              onChange={(e) => setWithdrawalDetails((prev) => ({ ...prev, account_number: e.target.value }))}
                              className="glass-input py-2 text-xs font-mono"
                              placeholder="Account no."
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-white/40 uppercase block mb-1">IFSC Code</label>
                            <input
                              type="text"
                              value={withdrawalDetails.ifsc_code}
                              onChange={(e) => setWithdrawalDetails((prev) => ({ ...prev, ifsc_code: e.target.value.toUpperCase() }))}
                              className="glass-input py-2 text-xs font-mono"
                              placeholder="IFSC"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase block mb-1">Branch (optional)</label>
                          <input
                            type="text"
                            value={withdrawalDetails.branch}
                            onChange={(e) => setWithdrawalDetails((prev) => ({ ...prev, branch: e.target.value }))}
                            className="glass-input py-2 text-xs"
                            placeholder="Branch name"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-white/40 uppercase block mb-1">Note (optional)</label>
                          <textarea
                            value={withdrawalDetails.note}
                            onChange={(e) => setWithdrawalDetails((prev) => ({ ...prev, note: e.target.value }))}
                            className="glass-input py-2 text-xs min-h-[72px]"
                            placeholder="Anything admin should know"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-white/40 uppercase block mb-1">Bank Reference ID / UTR No.</label>
                        <input
                          type="text"
                          value={txRef}
                          onChange={(e) => setTxRef(e.target.value)}
                          className="glass-input py-2 text-xs font-mono"
                          placeholder={paymentConfigs?.bank?.reference_hint || 'Enter UTR reference ID'}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : tab === 'deposit' ? (
                <div className="h-full min-h-[220px] rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center p-6 text-white/20 select-none">
                  <span className="text-4xl mb-2">💵</span>
                  <span className="text-sm font-semibold">Enter Deposit Amount</span>
                  <span className="text-xs text-white/10 mt-1">Payment options will become available</span>
                </div>
              ) : null}

              {(tab !== 'deposit' || parseFloat(amount) > 0) && (
                <button
                  onClick={handleAction}
                  disabled={loading || !isFormValid()}
                  className={`w-full mt-4 py-3.5 rounded-xl font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    tab === 'deposit'
                      ? 'bg-gradient-to-r from-accent-500 to-accent-600 shadow-[0_4px_15px_rgba(0,220,110,0.3)] hover:shadow-[0_4px_25px_rgba(0,220,110,0.5)]'
                      : tab === 'withdraw'
                        ? 'bg-gradient-to-r from-red-500 to-red-600 shadow-[0_4px_15px_rgba(239,68,68,0.3)]'
                        : 'bg-gradient-to-r from-primary-500 to-primary-600 shadow-[0_4px_15px_rgba(59,130,246,0.3)]'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    <>
                      {tab === 'deposit' ? '💰 Deposit' : tab === 'withdraw' ? '💸 Withdraw' : '🔄 Transfer'}
                      {amount ? ` ${format(parseFloat(amount) || 0)}` : ''}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="px-5 py-3 border-b border-white/5">
            <h3 className="text-sm font-display font-bold text-white">Transaction History</h3>
          </div>
          {transactions.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-3xl mb-2">📜</div>
              <p className="text-sm text-white/30">No transactions yet</p>
              <p className="text-xs text-white/15">Your deposit and withdrawal history will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.03]">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                      t.amount > 0 ? 'bg-accent-500/10 text-accent-400' : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {t.amount > 0 ? '↓' : '↑'}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white capitalize">{t.type?.replace(/_/g, ' ')}</div>
                    <div className="text-[10px] text-white/20">
                      {t.date} • {t.method} •{' '}
                      <span className={t.status === 'completed' ? 'text-accent-400' : 'text-gold-400'}>{t.status}</span>
                    </div>
                  </div>
                  <div className={`text-sm font-mono font-bold ${t.amount > 0 ? 'text-accent-400' : 'text-red-400'}`}>
                    {t.amount > 0 ? '+' : ''}{format(Math.abs(t.amount))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

