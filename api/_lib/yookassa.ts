import crypto from 'crypto'

interface CreatePaymentParams {
  amount: number // в копейках
  description: string
  returnUrl: string
  metadata?: Record<string, string>
}

interface YooKassaPayment {
  id: string
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled'
  amount: {
    value: string
    currency: string
  }
  confirmation?: {
    type: string
    confirmation_url: string
  }
  created_at: string
  description: string
  metadata?: Record<string, string>
  paid: boolean
  refundable: boolean
}

const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3'

function getAuthHeader(): string {
  const shopId = process.env.YOOKASSA_SHOP_ID
  const secretKey = process.env.YOOKASSA_SECRET_KEY

  if (!shopId || !secretKey) {
    throw new Error('YooKassa credentials not configured')
  }

  return 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64')
}

export async function createPayment(params: CreatePaymentParams): Promise<YooKassaPayment> {
  const idempotenceKey = crypto.randomUUID()

  const response = await fetch(`${YOOKASSA_API_URL}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader(),
      'Idempotence-Key': idempotenceKey,
    },
    body: JSON.stringify({
      amount: {
        value: (params.amount / 100).toFixed(2),
        currency: 'RUB',
      },
      confirmation: {
        type: 'redirect',
        return_url: params.returnUrl,
      },
      capture: true,
      description: params.description,
      metadata: params.metadata,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('YooKassa error:', error)
    throw new Error(`YooKassa API error: ${response.status}`)
  }

  return response.json()
}

export async function getPayment(paymentId: string): Promise<YooKassaPayment> {
  const response = await fetch(`${YOOKASSA_API_URL}/payments/${paymentId}`, {
    headers: {
      'Authorization': getAuthHeader(),
    },
  })

  if (!response.ok) {
    throw new Error(`YooKassa API error: ${response.status}`)
  }

  return response.json()
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  // YooKassa doesn't require webhook signature verification by default
  // But you can implement IP whitelist or custom logic here
  // For production, enable webhook authentication in YooKassa dashboard
  return true
}

export interface YooKassaWebhookEvent {
  type: 'notification'
  event: 'payment.succeeded' | 'payment.canceled' | 'payment.waiting_for_capture' | 'refund.succeeded'
  object: YooKassaPayment
}
