import { NextResponse } from 'next/server'
import { PRO_PLANS, type ProPlanId } from '@/lib/pro/plans'
import { requireStudentApi } from '@/lib/studentApi'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const planId = String(body.planId || 'yearly') as ProPlanId
    const plan = PRO_PLANS[planId]

    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 })
    }

    const authCtx = await requireStudentApi(req, body.student_id).catch(() => null)
    const studentId = authCtx && authCtx.ok ? authCtx.studentId : String(body.student_id || 'guest_user')

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    const amountPaise = plan.price * 100
    const currency = 'INR'
    const receipt = `rcpt_${studentId.slice(0, 8)}_${Date.now().toString(36)}`

    // Create real order using Razorpay SDK
    if (keyId && keySecret) {
      const { getRazorpayClient } = await import('@/lib/razorpay')
      const razorpay = getRazorpayClient()
      const rzpData = await razorpay.orders.create({
        amount: amountPaise,
        currency,
        receipt,
        notes: {
          studentId,
          planId,
          planName: plan.name,
        },
      })

      return NextResponse.json({
        ok: true,
        orderId: rzpData.id,
        order_id: rzpData.id,
        amount: rzpData.amount,
        currency: rzpData.currency,
        keyId,
        key_id: keyId,
        plan,
        simulated: false,
      })
    }

    // Sandbox / Test fallback when keys are not in environment yet
    const simulatedOrderId = `order_sim_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
    return NextResponse.json({
      ok: true,
      orderId: simulatedOrderId,
      amount: amountPaise,
      currency,
      keyId: 'rzp_test_simulated',
      plan,
      simulated: true,
    })
  } catch (err: any) {
    console.error('Create order error:', err)
    return NextResponse.json({ error: err?.message || 'Server error creating payment order' }, { status: 500 })
  }
}
