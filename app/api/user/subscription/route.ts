import { NextResponse } from 'next/server'
import { getServiceRoleClient } from '@/lib/supabaseServer'
import { requireStudentApi } from '@/lib/studentApi'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const paramStudentId = searchParams.get('student_id')

    const authCtx = await requireStudentApi(req, paramStudentId).catch(() => null)
    const studentId = authCtx && authCtx.ok ? authCtx.studentId : paramStudentId

    if (!studentId) {
      return NextResponse.json({ ok: true, isPro: false, subscription: null })
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentId)
    if (!isUuid) {
      return NextResponse.json({ ok: true, isPro: false, subscription: null })
    }

    const supabase = getServiceRoleClient()
    if (!supabase) {
      return NextResponse.json({ ok: true, isPro: false, subscription: null })
    }

    const nowIso = new Date().toISOString()
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .gt('expires_at', nowIso)
      .order('expires_at', { ascending: false })
      .limit(1)

    if (error) {
      console.warn('Subscription fetch warning:', error.message)
      return NextResponse.json({ ok: true, isPro: false, subscription: null })
    }

    const activeSub = data && data.length > 0 ? data[0] : null
    const isPro = Boolean(activeSub)

    return NextResponse.json({
      ok: true,
      isPro,
      subscription: activeSub,
    })
  } catch (err: any) {
    console.error('Subscription status error:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Failed to fetch subscription' }, { status: 500 })
  }
}
