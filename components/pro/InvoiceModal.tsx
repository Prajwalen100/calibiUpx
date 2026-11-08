'use client'
import React, { useRef } from 'react'
import Image from 'next/image'
import {
  X,
  Printer,
  Download,
  ShieldCheck,
  CheckCircle2,
  Crown,
  Building2,
  Calendar,
  CreditCard,
  Hash,
  Mail,
  User,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { usePro } from '@/lib/pro/context'
import { useStore } from '@/lib/store'
import { PRO_PLANS, type ProPlanId } from '@/lib/pro/plans'

export function InvoiceModal() {
  const { isInvoiceModalOpen, closeInvoiceModal, invoiceData, subscription } = usePro()
  const { user, profile } = useStore()
  const invoiceRef = useRef<HTMLDivElement>(null)

  if (!isInvoiceModalOpen) return null

  // Use provided invoiceData or active subscription fallback
  const sub = invoiceData || subscription || {}
  const planId: ProPlanId = (sub.plan as ProPlanId) || 'yearly'
  const plan = PRO_PLANS[planId] || PRO_PLANS.yearly

  const totalAmount = sub.amount_paise ? sub.amount_paise / 100 : plan.price
  // Tax breakdown (18% GST inclusive: Taxable = Total / 1.18)
  const taxableAmount = Math.round((totalAmount / 1.18) * 100) / 100
  const gstAmount = Math.round((totalAmount - taxableAmount) * 100) / 100
  const cgst = Math.round((gstAmount / 2) * 100) / 100
  const sgst = Math.round((gstAmount - cgst) * 100) / 100

  const paymentId = sub.razorpay_payment_id || sub.payment_id || `pay_${(sub.id || 'live').slice(-8)}`
  const orderId = sub.razorpay_order_id || sub.order_id || `order_${(sub.id || 'live').slice(-8)}`
  const invoiceNumber = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(paymentId).replace('pay_', '').slice(-6).toUpperCase()}`

  const startDate = sub.starts_at ? new Date(sub.starts_at) : new Date()
  const expiryDate = sub.expires_at
    ? new Date(sub.expires_at)
    : new Date(startDate.getTime() + (plan.durationDays || 365) * 24 * 60 * 60 * 1000)

  const handlePrint = () => {
    window.print()
  }

  const studentName = profile?.full_name || user?.name || 'Verified Student'
  const studentEmail = user?.email || 'student@calibiupx.com'
  const studentId = user?.id || sub.student_id || 'CALIBI-STUDENT'
  const college = profile?.college || 'CalibiUpX Placement Candidate'

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto backdrop-blur-md bg-slate-950/80 animate-fade-in print:p-0 print:bg-white print:static"
    >
      {/* Modal Container */}
      <div className="relative w-full max-w-3xl max-h-[94vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl text-slate-800 dark:text-slate-100 p-6 sm:p-10 print:border-none print:shadow-none print:p-0 print:max-h-none print:overflow-visible print:w-full print:bg-white print:text-black">
        {/* Screen Action Bar (Hidden when printing) */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Tax Invoice & Receipt</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Official GST Compliant Payment Confirmation</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={closeInvoiceModal}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Close invoice"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Paper Sheet */}
        <div ref={invoiceRef} className="pt-6 space-y-6 print:pt-0">
          {/* Company Brand & Invoice Meta */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-6 print:border-black/30">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-tr from-indigo-600 to-purple-600 p-2 shadow-md shrink-0 flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="CalibiUpX Logo"
                  width={44}
                  height={44}
                  className="object-contain"
                  priority
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white print:text-black">
                    Calibi<span className="text-indigo-600 dark:text-indigo-400">UpX</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 print:border-black print:text-black">
                    PRO
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 print:text-slate-600">
                  MindLyft AI Private Limited
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 print:text-slate-500">
                  GSTIN: 09AAECM4921Q1Z5 · SAC: 999293
                </p>
              </div>
            </div>

            <div className="sm:text-right">
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 print:border-black print:text-black">
                PAID & VERIFIED
              </span>
              <p className="mt-1 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 print:text-black">
                {invoiceNumber}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 print:text-slate-600">
                Date: {startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* 2-Column Info: Company & Billed To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs border-b border-slate-200/80 dark:border-slate-800 pb-6 print:border-black/30">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                Issued By
              </p>
              <p className="font-bold text-slate-900 dark:text-white print:text-black">
                MindLyft AI Pvt. Ltd. (CalibiUpX)
              </p>
              <p className="text-slate-600 dark:text-slate-400 print:text-slate-600 mt-0.5">
                MindLyft Towers, Tech Zone 4, Noida, UP - 201306, India
              </p>
              <p className="text-slate-600 dark:text-slate-400 print:text-slate-600">
                CIN: U72900UP2024PTC198421
              </p>
              <p className="text-slate-600 dark:text-slate-400 print:text-slate-600">
                Email: billing@calibiai.com · calibiai.com
              </p>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                Billed To (Student)
              </p>
              <p className="font-bold text-slate-900 dark:text-white print:text-black">
                {studentName}
              </p>
              <p className="text-slate-600 dark:text-slate-400 print:text-slate-600 mt-0.5">
                Email: {studentEmail}
              </p>
              <p className="text-slate-600 dark:text-slate-400 print:text-slate-600">
                Student ID: <span className="font-mono text-[11px]">{studentId}</span>
              </p>
              <p className="text-slate-600 dark:text-slate-400 print:text-slate-600">
                Institute: {college}
              </p>
            </div>
          </div>

          {/* Payment Gateway Transaction Reference Block */}
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 p-4 text-xs print:bg-slate-100 print:border-black/20">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Payment Method</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 print:text-black">
                  Razorpay (UPI/Card)
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Payment ID</span>
                <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200 print:text-black truncate block">
                  {paymentId}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Order ID</span>
                <span className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200 print:text-black truncate block">
                  {orderId}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Access Period</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 print:text-black">
                  {startDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} – {expiryDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 print:border-black/30">
                  <th className="py-2.5">Item & Description</th>
                  <th className="py-2.5 text-center">SAC</th>
                  <th className="py-2.5 text-center">Qty</th>
                  <th className="py-2.5 text-right">Taxable (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 print:divide-black/20">
                <tr>
                  <td className="py-3">
                    <p className="font-bold text-slate-900 dark:text-white print:text-black">
                      CalibiUpX Pro — {plan.name} Pass
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 print:text-slate-600 mt-0.5">
                      Full access to 60+ Company Mock Exams, 24/7 Mentorly AI Coach, Round Cutoff Predictions, and verified placement reports.
                    </p>
                  </td>
                  <td className="py-3 text-center text-slate-600 dark:text-slate-400 font-mono">999293</td>
                  <td className="py-3 text-center text-slate-600 dark:text-slate-400 font-medium">1</td>
                  <td className="py-3 text-right font-semibold text-slate-900 dark:text-white print:text-black font-mono">
                    ₹{taxableAmount.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pricing Calculation Summary */}
          <div className="flex justify-end pt-2 border-t border-slate-200/80 dark:border-slate-800 print:border-black/30">
            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Taxable Amount</span>
                <span className="font-mono font-medium">₹{taxableAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>CGST (9%)</span>
                <span className="font-mono font-medium">₹{cgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>SGST (9%)</span>
                <span className="font-mono font-medium">₹{sgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-sm font-black text-slate-900 dark:text-white print:text-black">
                <span>Total Amount Paid</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 print:text-black">
                  ₹{totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Legal and Disclaimer Note */}
          <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500 print:text-slate-600 space-y-1">
            <p>
              • This is a computer-generated digital tax invoice and does not require a physical signature.
            </p>
            <p>
              • Services provided under SAC 999293 (Commercial training & education assessment services). Inclusive of 18% GST.
            </p>
            <p>
              • For any billing queries or support, reach out to <span className="font-bold">support@calibiai.com</span> with your Payment ID <span className="font-mono">{paymentId}</span>.
            </p>
          </div>
        </div>

        {/* Bottom Screen Buttons (Hidden when printing) */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
          <button
            onClick={closeInvoiceModal}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Close Invoice
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handlePrint}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Download / Print PDF
            </button>
            <button
              onClick={() => {
                closeInvoiceModal()
                if (typeof window !== 'undefined') {
                  window.location.href = '/company-assessments'
                }
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-xs font-black text-white shadow-md transition active:scale-95"
            >
              <span>Practice 60+ Mocks</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
