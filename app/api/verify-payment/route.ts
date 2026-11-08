import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { PRO_PLANS, type ProPlanId } from '@/lib/pro/plans'
import { getServiceRoleClient } from '@/lib/supabaseServer'
import { requireStudentApi } from '@/lib/studentApi'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const {
      razorpay_order_id,
      order_id,
      razorpay_payment_id,
      payment_id,
      razorpay_signature,
      signature,
      plan_id,
      planId,
      student_id,
    } = body

    const orderId = razorpay_order_id || order_id
    const paymentId = razorpay_payment_id || payment_id
    const paymentSignature = razorpay_signature || signature
    const selectedPlanId = (plan_id || planId || 'yearly') as ProPlanId

    // Validate required fields
    if (!orderId || !paymentId || !paymentSignature) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required payment verification fields (order_id, payment_id, signature).',
        },
        { status: 400 }
      )
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (!keySecret) {
      return NextResponse.json(
        { success: false, error: 'Server misconfiguration: RAZORPAY_KEY_SECRET is not set.' },
        { status: 500 }
      )
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex')

    const expBuf = Buffer.from(expectedSignature)
    const sigBuf = Buffer.from(paymentSignature)
    const isMatch = expBuf.length === sigBuf.length && crypto.timingSafeEqual(expBuf, sigBuf)

    if (!isMatch) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment verification failed. Invalid transaction signature.',
        },
        { status: 400 }
      )
    }

    // Try resolving student ID from auth token or request body
    const authCtx = await requireStudentApi(req, student_id).catch(() => null)
    const studentId = authCtx && authCtx.ok ? authCtx.studentId : (student_id || 'guest_student')

    const plan = PRO_PLANS[selectedPlanId] || PRO_PLANS.yearly
    const now = new Date()
    const expiresAt = new Date(now.getTime() + (plan?.durationDays || 365) * 24 * 60 * 60 * 1000)

    const subscriptionRecord = {
      student_id: studentId,
      plan: plan.id,
      amount_paise: plan.price * 100,
      currency: 'INR',
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: paymentSignature,
      status: 'active',
      starts_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }

    // Persist to Supabase if valid UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId)
    const supabase = getServiceRoleClient()
    let savedSubscription: any = null

    if (supabase && isUuid) {
      const { data, error } = await supabase
        .from('subscriptions')
        .insert(subscriptionRecord)
        .select()
        .single()

      if (!error && data) {
        savedSubscription = data
      }
    }

    return NextResponse.json({
      success: true,
      ok: true,
      message: 'Payment verified successfully.',
      order_id: orderId,
      payment_id: paymentId,
      isPro: true,
      subscription: savedSubscription || {
        id: `sub_${Date.now()}`,
        ...subscriptionRecord,
      },
    })
  } catch (err: any) {
    console.error('Verify payment error:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal error verifying payment.' },
      { status: 500 }
    )
  }
}
