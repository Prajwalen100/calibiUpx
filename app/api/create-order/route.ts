import { NextResponse } from 'next/server'
import { getRazorpayClient } from '@/lib/razorpay'
import { PRO_PLANS, type ProPlanId } from '@/lib/pro/plans'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))

    let amountPaise = Number(body.amount)
    let currency = (body.currency || 'INR').toUpperCase()
    let receipt = body.receipt || `rcpt_${Date.now().toString(36)}`
    let notes: Record<string, string> = body.notes || {}

    // Support Calibi Pro plans if planId is passed
    if (body.planId && PRO_PLANS[body.planId as ProPlanId]) {
      const plan = PRO_PLANS[body.planId as ProPlanId]
      amountPaise = plan.price * 100
      notes = {
        planId: plan.id,
        planName: plan.name,
        studentId: String(body.student_id || 'guest'),
        ...notes,
      }
    }

    // Minimum amount: 100 paise
    if (!amountPaise || isNaN(amountPaise) || amountPaise < 100) {
      return NextResponse.json(
        { error: 'Amount must be at least 100 paise (₹1.00).' },
        { status: 400 }
      )
    }

    let razorpay: ReturnType<typeof getRazorpayClient>
    try {
      razorpay = getRazorpayClient()
    } catch (err: any) {
      return NextResponse.json(
        { error: 'Razorpay configuration error or missing credentials.', detail: err?.message },
        { status: 401 }
      )
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amountPaise),
      currency,
      receipt,
      notes,
    })

    return NextResponse.json({
      order_id: order.id,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      keyId: process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      receipt: order.receipt,
      status: order.status,
    })
  } catch (err: any) {
    console.error('Error creating Razorpay order:', err)
    return NextResponse.json(
      {
        error: err?.error?.description || err?.message || 'Failed to create Razorpay order.',
      },
      { status: 500 }
    )
  }
}
