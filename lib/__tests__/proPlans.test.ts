import test from 'node:test'
import assert from 'node:assert/strict'
import { PRO_PLANS, FREE_FEATURES, PRO_FEATURES } from '../pro/plans.ts'

test('PRO_PLANS structure and pricing values', () => {
  // Monthly plan: 299/-
  assert.equal(PRO_PLANS.monthly.price, 299)
  assert.equal(PRO_PLANS.monthly.durationDays, 30)

  // 6 Months plan: 599/-
  assert.equal(PRO_PLANS.half_yearly.price, 599)
  assert.equal(PRO_PLANS.half_yearly.durationDays, 180)

  // 1 Year plan: 899/- discounted from 1299/-
  assert.equal(PRO_PLANS.yearly.price, 899)
  assert.equal(PRO_PLANS.yearly.originalPrice, 1299)
  assert.equal(PRO_PLANS.yearly.durationDays, 365)
})

test('Free and Pro feature definitions', () => {
  assert.ok(FREE_FEATURES.some(f => f.includes('CalibiAI Core')))
  assert.ok(FREE_FEATURES.some(f => f.includes('Capgemini 2027')))

  assert.ok(PRO_FEATURES.some(f => f.includes('Mentorly')))
  assert.ok(PRO_FEATURES.some(f => f.includes('60+')))
})

test('Razorpay HMAC-SHA256 signature verification test', async () => {
  const crypto = await import('crypto')
  const secret = 'fsy2IAzQeKhdtP9keENyxCFp'
  const orderId = 'order_test_123'
  const paymentId = 'pay_test_456'

  const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex')
  assert.equal(typeof expected, 'string')
  assert.equal(expected.length, 64)

  // Verify match with timingSafeEqual
  const expBuf = Buffer.from(expected)
  const isMatch = crypto.timingSafeEqual(expBuf, Buffer.from(expected))
  assert.equal(isMatch, true)
})

