import Razorpay from 'razorpay'

export function getRazorpayClient(): Razorpay {
  const key_id = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  const key_secret = process.env.RAZORPAY_KEY_SECRET

  if (!key_id || !key_secret) {
    throw new Error('Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are missing in environment.')
  }

  return new Razorpay({
    key_id,
    key_secret,
  })
}
