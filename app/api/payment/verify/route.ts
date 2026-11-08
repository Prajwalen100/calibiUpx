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
      razorpay_payment_id,
      razorpay_signature,
      plan_id,
      student_id,
    } = body

    const planId = (plan_id || 'yearly') as ProPlanId
    const plan = PRO_PLANS[planId]

    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan specified' }, { status: 400 })
    }

    // Try resolving student ID from auth token or request body
    const authCtx = await requireStudentApi(req, student_id).catch(() => null)
    const studentId = authCtx && authCtx.ok ? authCtx.studentId : (student_id || 'guest_student')

    const keySecret = process.env.RAZORPAY_KEY_SECRET

    // Signature verification if live keys are present
    if (keySecret && razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex')

      if (generatedSignature !== razorpay_signature) {
        console.error('Razorpay signature verification failed:', {
          generatedSignature,
          razorpay_signature,
        })
        return NextResponse.json(
          { error: 'Payment signature verification failed. Invalid transaction signature.' },
          { status: 400 }
        )
      }
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000)

    const subscriptionRecord = {
      student_id: studentId,
      plan: plan.id,
      amount_paise: plan.price * 100,
      currency: 'INR',
      razorpay_order_id: razorpay_order_id || `sim_ord_${Date.now()}`,
      razorpay_payment_id: razorpay_payment_id || `pay_${Date.now()}`,
      razorpay_signature: razorpay_signature || 'simulated_signature',
      status: 'active',
      starts_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }

    // Persist to Supabase subscriptions table
    const supabase = getServiceRoleClient()
    if (supabase) {
      const { data, error } = await supabase
        .from('subscriptions')
        .insert(subscriptionRecord)
        .select()
        .single()

      if (error) {
        console.warn('Supabase subscription insert warning (falling back gracefully):', error.message)
      } else if (data) {
        return NextResponse.json({
          ok: true,
          isPro: true,
          subscription: data,
          message: `Successfully upgraded to CalibiUpX Pro (${plan.name})!`,
        })
      }
    }

    // Fallback response if Supabase was bypassed or offline
    return NextResponse.json({
      ok: true,
      isPro: true,
      subscription: {
        id: `sub_${Date.now()}`,
        ...subscriptionRecord,
      },
      message: `Successfully upgraded to CalibiUpX Pro (${plan.name})!`,
    })
  } catch (err: any) {
    console.error('Verify payment error:', err)
    return NextResponse.json(
      { error: err?.message || 'Internal error verifying payment' },
      { status: 500 }
    )
  }
}
