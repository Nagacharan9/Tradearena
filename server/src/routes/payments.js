import { Router } from 'express'

const router = Router()

// Public: get active payment configs
router.get('/configs', (req, res) => {
  const db = req.db
  const rows = db.prepare(`
    SELECT 
      method,
      qr_payload,
      display_value,
      reference_hint,
      bank_payee_name,
      bank_account_number,
      bank_ifsc_code,
      bank_qr_payload,
      updated_at
    FROM payment_configs
    WHERE is_active = 1
    ORDER BY method ASC
  `).all()
  res.json({ paymentConfigs: rows })
})

export default router

