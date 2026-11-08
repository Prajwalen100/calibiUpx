/**
 * Razorpay script loader and checkout launcher for CalibiUpX Pro.
 */

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false)
      return
    }

    if ((window as any).Razorpay) {
      resolve(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => {
      console.error('Failed to load Razorpay checkout script.')
      resolve(false)
    }
    document.body.appendChild(script)
  })
}

export interface CheckoutOptions {
  orderId: string
  amount: number
  currency: string
  keyId: string
  planName: string
  planId: string
  userName?: string
  userEmail?: string
  userContact?: string
  onSuccess: (paymentResult: {
    razorpay_payment_id: string
    razorpay_order_id: string
    razorpay_signature: string
  }) => void
  onError?: (err: any) => void
  onDismiss?: () => void
}

export async function openRazorpayCheckout(options: CheckoutOptions): Promise<void> {
  // If simulated fallback order (no real Razorpay keys configured yet)
  if (options.keyId === 'rzp_test_simulated' || options.orderId.startsWith('order_sim_')) {
    // Provide an immediate simulated successful transaction
    setTimeout(() => {
      options.onSuccess({
        razorpay_payment_id: `pay_sim_${Date.now().toString(36)}`,
        razorpay_order_id: options.orderId,
        razorpay_signature: `sig_sim_${Date.now().toString(36)}`,
      })
    }, 800)
    return
  }

  const loaded = await loadRazorpayScript()
  if (!loaded) {
    throw new Error('Unable to initialize Razorpay checkout. Please check your internet connection.')
  }

  const RazorpayConstructor = (window as any).Razorpay
  if (!RazorpayConstructor) {
    throw new Error('Razorpay SDK not loaded.')
  }

  const rzpOptions = {
    key: options.keyId,
    amount: options.amount,
    currency: options.currency || 'INR',
    name: 'CalibiUpX',
    description: `Upgrade to Pro - ${options.planName}`,
    image: '/favicon.ico',
    order_id: options.orderId,
    prefill: {
      name: options.userName || '',
      email: options.userEmail || '',
      contact: options.userContact || '',
    },
    theme: {
      color: '#4f46e5', // Calibi Indigo
    },
    modal: {
      ondismiss: () => {
        options.onDismiss?.()
      },
    },
    handler: (response: any) => {
      options.onSuccess({
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_signature: response.razorpay_signature,
      })
    },
  }

  const rzpInstance = new RazorpayConstructor(rzpOptions)
  rzpInstance.on('payment.failed', function (response: any) {
    console.error('Razorpay payment failed:', response.error)
    options.onError?.(response.error)
  })

  rzpInstance.open()
}
