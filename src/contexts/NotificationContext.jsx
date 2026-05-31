import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import api from '../services/api'

const NotificationContext = createContext(null)

let toastId = 0

const TOAST_STYLES = {
  success: { bg: 'bg-accent-500/10 border-accent-500/30', icon: '✅', title: 'text-accent-400' },
  error: { bg: 'bg-red-500/10 border-red-500/30', icon: '❌', title: 'text-red-400' },
  warning: { bg: 'bg-gold-500/10 border-gold-500/30', icon: '⚠️', title: 'text-gold-400' },
  info: { bg: 'bg-primary-500/10 border-primary-500/30', icon: 'ℹ️', title: 'text-primary-400' },
  trade_win: { bg: 'bg-accent-500/10 border-accent-500/30', icon: '🎉', title: 'text-accent-400' },
  trade_loss: { bg: 'bg-red-500/10 border-red-500/30', icon: '💔', title: 'text-red-400' },
  rank_up: { bg: 'bg-gold-500/10 border-gold-500/30', icon: '📈', title: 'text-gold-400' },
  prize: { bg: 'bg-gold-500/10 border-gold-500/30', icon: '🏆', title: 'text-gold-400' },
  deposit_submitted: { bg: 'bg-primary-500/10 border-primary-500/30', icon: '⏳', title: 'text-primary-400' },
  deposit_approved: { bg: 'bg-accent-500/10 border-accent-500/30', icon: '💰', title: 'text-accent-400' },
  deposit_rejected: { bg: 'bg-red-500/10 border-red-500/30', icon: '❌', title: 'text-red-400' },
  withdrawal_submitted: { bg: 'bg-primary-500/10 border-primary-500/30', icon: '⏳', title: 'text-primary-400' },
  withdrawal_approved: { bg: 'bg-accent-500/10 border-accent-500/30', icon: '💸', title: 'text-accent-400' },
  withdrawal_rejected: { bg: 'bg-red-500/10 border-red-500/30', icon: '❌', title: 'text-red-400' },
  tournament_joined: { bg: 'bg-gold-500/10 border-gold-500/30', icon: '🎟️', title: 'text-gold-400' },
  transfer: { bg: 'bg-primary-500/10 border-primary-500/30', icon: '🔄', title: 'text-primary-400' }
}

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('tradearena_notifications')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  
  const knownTxIds = useRef(new Set())
  const lastKnownStatus = useRef(new Map())
  const pollingStarted = useRef(false)

  // Save to local storage when notifications change
  useEffect(() => {
    localStorage.setItem('tradearena_notifications', JSON.stringify(notifications))
  }, [notifications])

  const notify = useCallback((type, message, duration = 5000) => {
    // 1. Add ephemeral toast
    const tId = ++toastId
    setToasts(prev => [...prev, { id: tId, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(n => n.id !== tId))
    }, duration)

    // 2. Add persistent notification
    const newNotif = {
      id: Date.now().toString() + Math.random().toString(36).substring(2),
      type,
      message,
      timestamp: Date.now(),
      read: false
    }
    setNotifications(prev => [newNotif, ...prev].slice(0, 50)) // keep last 50
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(n => n.id !== id))
  }, [])

  const markRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  // Poll for transaction updates
  useEffect(() => {
    if (pollingStarted.current) return
    pollingStarted.current = true

    let interval;
    
    const checkTransactions = async () => {
      if (!api.isLoggedIn()) return;
      try {
        const txsRaw = await api.getTransactions()
        const txs = Array.isArray(txsRaw) ? txsRaw : []
        
        txs.forEach(tx => {
          // If we haven't seen this tx before, just record its status
          if (!knownTxIds.current.has(tx.id)) {
            knownTxIds.current.add(tx.id)
            lastKnownStatus.current.set(tx.id, tx.status)
            return
          }
          
          // If we have seen it, check if status changed from pending
          const prevStatus = lastKnownStatus.current.get(tx.id)
          if (prevStatus === 'pending' && tx.status !== 'pending') {
            lastKnownStatus.current.set(tx.id, tx.status)
            
            // It changed! Fire a notification
            const amountStr = `$${Math.abs(tx.amount).toFixed(2)}`
            if (tx.type === 'deposit') {
              if (tx.status === 'completed' || tx.status === 'approved') {
                notify('deposit_approved', `Deposit of ${amountStr} approved — funds added to balance`)
              } else if (tx.status === 'rejected' || tx.status === 'failed') {
                notify('deposit_rejected', `Deposit of ${amountStr} rejected`)
              }
            } else if (tx.type === 'withdrawal') {
               if (tx.status === 'completed' || tx.status === 'approved') {
                notify('withdrawal_approved', `Withdrawal of ${amountStr} approved — funds sent`)
              } else if (tx.status === 'rejected' || tx.status === 'failed') {
                notify('withdrawal_rejected', `Withdrawal of ${amountStr} rejected — funds returned to balance`)
              }
            }
          }
        })
      } catch (e) {
        console.error('Failed to poll transactions for notifications', e)
      }
    }

    // Initial check
    checkTransactions()
    
    // Poll every 30 seconds
    interval = setInterval(checkTransactions, 30000)
    
    return () => clearInterval(interval)
  }, [notify])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotificationContext.Provider value={{ notify, notifications, unreadCount, markRead, markAllRead, clearAll }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: '380px' }}>
        {toasts.map((n, i) => (
          <Toast key={n.id} notification={n} onDismiss={() => dismissToast(n.id)} index={i} />
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

function Toast({ notification, onDismiss, index }) {
  const style = TOAST_STYLES[notification.type] || TOAST_STYLES.info
  return (
    <div
      className={`pointer-events-auto ${style.bg} border rounded-xl px-4 py-3 backdrop-blur-xl shadow-glass animate-slide-down flex items-start gap-3`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <span className="text-lg shrink-0">{style.icon}</span>
      <p className={`text-sm font-medium ${style.title} flex-1`}>{notification.message}</p>
      <button onClick={onDismiss} className="text-white/20 hover:text-white/60 transition-colors shrink-0 text-xs">✕</button>
    </div>
  )
}

export function useNotification() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider')
  return ctx
}
export { TOAST_STYLES }
